import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../../schemas/user.schema';
import { UserDto } from './dto/user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Order } from '../../schemas/order.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
  ) { }

  async create(user: UserDto) {
    return await new this.userModel(user).save();
  }

  async findOneByEmail(email: string): Promise<UserDto> {
    const user = await this.userModel.findOne({
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    }).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findOneByEmailWithOutException(email: string): Promise<UserDto> {
    const user = await this.userModel.findOne({
      email: { $regex: new RegExp(`^${email}$`, 'i') }
    }).exec();
    return user;
  }

  async update(id: string, user: UpdateUserDto) {
    return await this.userModel
      .findByIdAndUpdate(id, user, { new: true })
      .exec();
  }

  async findAll() {
    return await this.userModel.find().exec();
  }

  async findById(id: string) {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }




  ///// ESTADISTICAS

  async getClientsForWhatsapp(params?: {
    category?: string;
    type?: string;
    page?: number;
    limit?: number;
  }) {
    const { category, type, page = 1, limit = 50 } = params || {};

    const now = new Date();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(now.getDate() - 90);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(now.getDate() - 60);
    const fortyFiveDaysAgo = new Date();
    fortyFiveDaysAgo.setDate(now.getDate() - 45);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // Pre-filtrado de emails si se especifica categoría y tipo
    let preMatchedEmails: string[] | null = null;

    if (type === 'behavior' && category) {
      const behaviorMatch: any = {};

      if (category === 'new') {
        behaviorMatch.count = 1;
        behaviorMatch.lastDate = { $gte: sevenDaysAgo };
      } else if (category === 'tracking') {
        behaviorMatch.count = 1;
        behaviorMatch.lastDate = { $lt: sevenDaysAgo, $gte: sixtyDaysAgo };
      } else if (category === 'no-recompra') {
        behaviorMatch.count = 1;
        behaviorMatch.lastDate = { $lt: sixtyDaysAgo };
      } else if (category === 'recompra') {
        behaviorMatch.count = 2;
        behaviorMatch.lastDate = { $gte: sevenDaysAgo };
      } else if (category === 'active') {
        behaviorMatch.count = { $gte: 2 };
        behaviorMatch.lastDate = { $gte: fortyFiveDaysAgo };
      } else if (category === 'possible-inactive') {
        behaviorMatch.lastDate = { $lt: fortyFiveDaysAgo, $gte: sixtyDaysAgo };
      } else if (category === 'lost') {
        behaviorMatch.lastDate = { $lt: sixtyDaysAgo };
      }

      if (Object.keys(behaviorMatch).length > 0) {
        const emailAgg = await this.orderModel.aggregate([
          { $group: { _id: '$user.email', count: { $sum: 1 }, lastDate: { $max: '$createdAt' } } },
          { $match: behaviorMatch }
        ]);
        preMatchedEmails = emailAgg.map(e => e._id).filter(e => !!e);
      }
    }

    // 1. Obtener categorías de comportamiento
    const behaviorPipeline: any[] = [];

    // Si ya pre-filtramos emails, el primer paso es limitar por esos emails
    if (preMatchedEmails) {
      behaviorPipeline.push({ $match: { email: { $in: preMatchedEmails } } });
    } else {
      behaviorPipeline.push({ $match: { role: { $ne: 1 } } });
    }

    behaviorPipeline.push(
      {
        $lookup: {
          from: 'addresses',
          let: { userEmail: '$email' },
          pipeline: [
            { $match: { $expr: { $eq: ['$email', '$$userEmail'] } } },
            { $project: { phone: 1 } }
          ],
          as: 'userAddresses',
        },
      },
      {
        $lookup: {
          from: 'orders',
          let: { userEmail: '$email' },
          pipeline: [
            { $match: { $expr: { $eq: ['$user.email', '$$userEmail'] } } },
            { $project: { total: 1, createdAt: 1 } }
          ],
          as: 'userOrders',
        },
      },
      {
        $project: {
          email: 1,
          name: 1,
          lastName: 1,
          phoneNumber: 1,
          phone: 1,
          addressPhones: '$userAddresses.phone',
          orderPhones: '$userOrders.address.phone',
          orderCount: { $size: '$userOrders' },
          totalSpent: { $sum: '$userOrders.total' },
          lastOrderDate: { $max: '$userOrders.createdAt' },
          firstRecentOrder: {
            $min: {
              $map: {
                input: {
                  $filter: {
                    input: '$userOrders',
                    as: 'o',
                    cond: { $gte: ['$$o.createdAt', ninetyDaysAgo] },
                  },
                },
                as: 'rf',
                in: '$$rf.createdAt',
              },
            },
          },
          lastOldOrder: {
            $max: {
              $map: {
                input: {
                  $filter: {
                    input: '$userOrders',
                    as: 'o',
                    cond: { $lt: ['$$o.createdAt', ninetyDaysAgo] },
                  },
                },
                as: 'of',
                in: '$$of.createdAt',
              },
            },
          },
        },
      },
      {
        $addFields: {
          isRecovered: {
            $cond: [
              { $and: ['$firstRecentOrder', '$lastOldOrder'] },
              {
                $gte: [
                  {
                    $divide: [
                      { $subtract: ['$firstRecentOrder', '$lastOldOrder'] },
                      1000 * 60 * 60 * 24,
                    ],
                  },
                  60,
                ],
              },
              false,
            ],
          },
        },
      },
      {
        $addFields: {
          behaviorCategory: {
            $switch: {
              branches: [
                {
                  case: {
                    $and: [
                      { $eq: ['$orderCount', 1] },
                      { $gte: ['$lastOrderDate', sevenDaysAgo] },
                    ],
                  },
                  then: 'new',
                },
                {
                  case: {
                    $and: [
                      { $eq: ['$orderCount', 1] },
                      { $lt: ['$lastOrderDate', sevenDaysAgo] },
                      { $gte: ['$lastOrderDate', sixtyDaysAgo] },
                    ],
                  },
                  then: 'tracking',
                },
                {
                  case: {
                    $and: [
                      { $eq: ['$orderCount', 1] },
                      { $lt: ['$lastOrderDate', sixtyDaysAgo] },
                    ],
                  },
                  then: 'no-recompra',
                },
                {
                  case: {
                    $and: [
                      { $eq: ['$orderCount', 2] },
                      { $gte: ['$lastOrderDate', sevenDaysAgo] },
                    ],
                  },
                  then: 'recompra',
                },
                { case: { $eq: ['$isRecovered', true] }, then: 'recovered' },
                { case: { $gte: ['$lastOrderDate', fortyFiveDaysAgo] }, then: 'active' },
                {
                  case: {
                    $and: [
                      { $lt: ['$lastOrderDate', fortyFiveDaysAgo] },
                      { $gte: ['$lastOrderDate', sixtyDaysAgo] },
                    ],
                  },
                  then: 'possible-inactive',
                },
              ],
              default: 'lost',
            },
          },
        },
      }
    );

    // Si filtramos por comportamiento y NO pudimos pre-filtrar antes (ej: recovered)
    if (type === 'behavior' && category && !preMatchedEmails) {
      behaviorPipeline.push({ $match: { behaviorCategory: category } });
    }

    const behaviorAggregation = await this.userModel.aggregate(behaviorPipeline);
    const matchedEmails = behaviorAggregation.map(u => u.email);

    // 2. Obtener categorías de gasto
    // Solo procesamos spending para los usuarios que pasaron el filtro de comportamiento
    const spendingPipeline: any[] = [
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          ...(matchedEmails.length > 0 ? { 'user.email': { $in: matchedEmails } } : {})
        }
      },
    ];

    // Si el filtro es por spending, y hay muchos usuarios, podríamos pre-filtrar también aquí
    // Pero como ya filtramos por behavior emails arriba, ya está optimizado para ese caso.

    spendingPipeline.push(
      {
        $project: {
          userEmail: { $ifNull: ['$user.email', '$address.email'] },
          items: 1,
        },
      },
      { $unwind: '$items' },
      {
        $addFields: {
          firstOption: { $arrayElemAt: ['$items.options', 0] },
        },
      },
      {
        $addFields: {
          fullText: {
            $concat: [
              { $ifNull: ['$items.name', ''] },
              ' ',
              { $ifNull: ['$items.description', ''] },
              ' ',
              { $ifNull: ['$firstOption.name', ''] },
              ' ',
              { $ifNull: ['$firstOption.description', ''] },
            ],
          },
        },
      },
      {
        $addFields: {
          weightMatches: {
            $regexFindAll: {
              input: '$fullText',
              regex: '(\\d+(?:[.,]\\d+)?)\\s*([Kk][Gg]|[Gg][Rr][Ss]?|[Gg]|[Cc][Cc]|[Mm][Ll])',
            },
          },
          itemQty: {
            $ifNull: ['$items.quantity', { $ifNull: ['$firstOption.quantity', 1] }],
          },
        },
      },
      {
        $addFields: {
          itemWeight: {
            $let: {
              vars: {
                processedMatches: {
                  $map: {
                    input: '$weightMatches',
                    as: 'm',
                    in: {
                      value: {
                        $convert: {
                          input: {
                            $replaceAll: {
                              input: { $arrayElemAt: ['$$m.captures', 0] },
                              find: ',',
                              replacement: '.',
                            },
                          },
                          to: 'double',
                          onError: 0,
                          onNull: 0,
                        },
                      },
                      isKg: {
                        $regexMatch: {
                          input: { $arrayElemAt: ['$$m.captures', 1] },
                          regex: '[Kk][Gg]',
                        },
                      },
                    },
                  },
                },
              },
              in: {
                $let: {
                  vars: {
                    kgMatches: {
                      $filter: {
                        input: '$$processedMatches',
                        as: 'pm',
                        cond: '$$pm.isKg',
                      },
                    },
                  },
                  in: {
                    $cond: [
                      { $gt: [{ $size: '$$kgMatches' }, 0] },
                      {
                        $reduce: {
                          input: '$$kgMatches',
                          initialValue: 0,
                          in: { $add: ['$$value', '$$this.value'] },
                        },
                      },
                      {
                        $reduce: {
                          input: '$$processedMatches',
                          initialValue: 0,
                          in: { $add: ['$$value', { $multiply: ['$$this.value', 0.001] }] },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: '$_id',
          email: { $first: '$userEmail' },
          totalKgInOrder: { $sum: { $multiply: ['$itemWeight', '$itemQty'] } },
        },
      },
      {
        $group: {
          _id: '$email',
          totalKg: { $sum: '$totalKgInOrder' },
        },
      },
      {
        $project: {
          spendingCategory: {
            $switch: {
              branches: [
                { case: { $gt: ['$totalKg', 15] }, then: 'premium' },
                {
                  case: { $and: [{ $gt: ['$totalKg', 5] }, { $lte: ['$totalKg', 15] }] },
                  then: 'standard',
                },
              ],
              default: 'basic',
            },
          },
        },
      }
    );

    // Si el filtro era por gasto, aplicarlo aquí
    if (type === 'spending' && category) {
      spendingPipeline.push({ $match: { spendingCategory: category } });
    }

    const spendingAggregation = await this.orderModel.aggregate(spendingPipeline);
    const spendingMap = new Map<string, string>();

    spendingAggregation.forEach((s) => {
      if (s._id) spendingMap.set(s._id, s.spendingCategory);
    });

    // 3. Si el filtro era por spending, tenemos que re-filtrar behavior por esos emails
    let behaviorResults = behaviorAggregation;
    if (type === 'spending' && category) {
      behaviorResults = behaviorAggregation.filter(u => spendingMap.has(u.email));
    }

    // Combinar datos
    let clients = behaviorResults.map((u) => {
      const phoneFallback = (u.addressPhones && u.addressPhones.length > 0)
        ? u.addressPhones[u.addressPhones.length - 1]
        : (u.orderPhones && u.orderPhones.length > 0)
          ? u.orderPhones[u.orderPhones.length - 1]
          : null;

      return {
        id: u._id?.toString(),
        email: u.email,
        name: `${u.name || ''}${u.lastName ? ' ' + u.lastName : ''}`.trim(),
        phone: u.phoneNumber || u.phone || phoneFallback,
        orderCount: u.orderCount,
        lastOrder: u.lastOrderDate ?? null,
        totalSpent: u.totalSpent || 0,
        behaviorCategory: u.behaviorCategory,
        spendingCategory: spendingMap.get(u.email) || 'basic',
      };
    });

    // Si no se especificó tipo pero sí categoría, filtramos al final
    if (!type && category) {
      clients = clients.filter(
        (c) => c.behaviorCategory === category || c.spendingCategory === category,
      );
    }

    const totalCount = clients.length;
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;
    const paginatedClients = clients.slice(skip, skip + limit);

    return {
      clients: paginatedClients,
      pagination: {
        totalCount,
        totalPages,
        currentPage: page,
        hasMore: page < totalPages,
      },
    };
  }

  async getClientAnalytics() {
    const now = new Date();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(now.getDate() - 90);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(now.getDate() - 60);
    const fortyFiveDaysAgo = new Date();
    fortyFiveDaysAgo.setDate(now.getDate() - 45);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // Optimizamos la agregación:
    // 1. Empezamos directamente desde las órdenes para las métricas de gasto del último mes
    // 2. Usamos una sola agregación para el comportamiento si es posible, o mejoramos las existentes.

    // Datos de comportamiento y métricas generales (desde User + Lookup Orders)
    const behaviorAggregation = await this.userModel.aggregate([
      { $match: { role: { $ne: 1 } } }, // Excluir admins si el role 1 es admin
      {
        $lookup: {
          from: 'orders',
          localField: 'email',
          foreignField: 'user.email',
          as: 'userOrders',
        },
      },
      {
        $project: {
          email: 1,
          orderCount: { $size: '$userOrders' },
          totalSpent: { $sum: '$userOrders.total' },
          lastOrderDate: { $max: '$userOrders.createdAt' },
          firstRecentOrder: {
            $min: {
              $map: {
                input: {
                  $filter: {
                    input: '$userOrders',
                    as: 'o',
                    cond: { $gte: ['$$o.createdAt', ninetyDaysAgo] }
                  }
                },
                as: 'rf',
                in: '$$rf.createdAt'
              }
            }
          },
          lastOldOrder: {
            $max: {
              $map: {
                input: {
                  $filter: {
                    input: '$userOrders',
                    as: 'o',
                    cond: { $lt: ['$$o.createdAt', ninetyDaysAgo] }
                  }
                },
                as: 'of',
                in: '$$of.createdAt'
              }
            }
          }
        }
      },
      {
        $addFields: {
          isRecovered: {
            $cond: [
              { $and: ['$firstRecentOrder', '$lastOldOrder'] },
              {
                $gte: [
                  {
                    $divide: [
                      { $subtract: ['$firstRecentOrder', '$lastOldOrder'] },
                      1000 * 60 * 60 * 24
                    ]
                  },
                  60
                ]
              },
              false
            ]
          }
        }
      },
      {
        $project: {
          email: 1,
          orderCount: 1,
          totalSpent: 1,
          lastOrderDate: 1,
          behaviorCategory: {
            $switch: {
              branches: [
                {
                  case: {
                    $and: [
                      { $eq: ['$orderCount', 1] },
                      { $gte: ['$lastOrderDate', sevenDaysAgo] }
                    ]
                  },
                  then: 'new'
                },
                {
                  case: {
                    $and: [
                      { $eq: ['$orderCount', 1] },
                      { $lt: ['$lastOrderDate', sevenDaysAgo] },
                      { $gte: ['$lastOrderDate', sixtyDaysAgo] }
                    ]
                  },
                  then: 'tracking'
                },
                {
                  case: {
                    $and: [
                      { $eq: ['$orderCount', 1] },
                      { $lt: ['$lastOrderDate', sixtyDaysAgo] }
                    ]
                  },
                  then: 'no-recompra'
                },
                {
                  case: {
                    $and: [
                      { $eq: ['$orderCount', 2] },
                      { $gte: ['$lastOrderDate', sevenDaysAgo] }
                    ]
                  },
                  then: 'recompra'
                },
                {
                  case: { $eq: ['$isRecovered', true] },
                  then: 'recovered'
                },
                {
                  case: { $gte: ['$lastOrderDate', fortyFiveDaysAgo] },
                  then: 'active'
                },
                {
                  case: {
                    $and: [
                      { $lt: ['$lastOrderDate', fortyFiveDaysAgo] },
                      { $gte: ['$lastOrderDate', sixtyDaysAgo] }
                    ]
                  },
                  then: 'possible-inactive'
                }
              ],
              default: 'lost'
            }
          }
        }
      }
    ]);

    //deberiamos psarle ultimos 30 dias
    const spendingAggregation = await this.orderModel.aggregate([
      {
        $match: {
          createdAt: {
            // $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
            $gte: thirtyDaysAgo
          }
        }
      },
      {
        $project: {
          userEmail: { $ifNull: ["$user.email", "$address.email"] },
          orderTotal: "$total",
          items: 1
        }
      },
      {
        $unwind: "$items"
      },
      {
        $addFields: {
          firstOption: {
            $arrayElemAt: ["$items.options", 0]
          }
        }
      },
      {
        $addFields: {
          fullText: {
            $concat: [
              {
                $ifNull: ["$items.name", ""]
              },
              " ",
              {
                $ifNull: ["$items.description", ""]
              },
              " ",
              {
                $ifNull: ["$firstOption.name", ""]
              },
              " ",
              {
                $ifNull: [
                  "$firstOption.description",
                  ""
                ]
              }
            ]
          }
        }
      },
      {
        $addFields: {
          weightMatches: {
            $regexFindAll: {
              input: "$fullText",
              regex: "(\\d+(?:[.,]\\d+)?)\\s*([Kk][Gg]|[Gg][Rr][Ss]?|[Gg]|[Cc][Cc]|[Mm][Ll])"
            }
          },
          itemQty: {
            $ifNull: [
              "$items.quantity",
              {
                $ifNull: ["$firstOption.quantity", 1]
              }
            ]
          }
        }
      },
      {
        $addFields: {
          itemWeight: {
            $let: {
              vars: {
                processedMatches: {
                  $map: {
                    input: "$weightMatches",
                    as: "m",
                    in: {
                      value: {
                        $convert: {
                          input: {
                            $replaceAll: {
                              input: { $arrayElemAt: ["$$m.captures", 0] },
                              find: ",",
                              replacement: "."
                            }
                          },
                          to: "double",
                          onError: 0,
                          onNull: 0
                        }
                      },
                      unit: { $arrayElemAt: ["$$m.captures", 1] },
                      isKg: {
                        $regexMatch: {
                          input: { $arrayElemAt: ["$$m.captures", 1] },
                          regex: "[Kk][Gg]"
                        }
                      }
                    }
                  }
                }
              },
              in: {
                $let: {
                  vars: {
                    kgMatches: {
                      $filter: {
                        input: "$$processedMatches",
                        as: "pm",
                        cond: "$$pm.isKg"
                      }
                    }
                  },
                  in: {
                    $cond: [
                      { $gt: [{ $size: "$$kgMatches" }, 0] },
                      // Si hay KGs, sumamos solo los KGs
                      {
                        $reduce: {
                          input: "$$kgMatches",
                          initialValue: 0,
                          in: { $add: ["$$value", "$$this.value"] }
                        }
                      },
                      // Si NO hay KGs, sumamos gramos/cc convirtiendo a 0.001
                      {
                        $reduce: {
                          input: "$$processedMatches",
                          initialValue: 0,
                          in: { $add: ["$$value", { $multiply: ["$$this.value", 0.001] }] }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: "$_id",
          email: {
            $first: "$userEmail"
          },
          orderTotal: {
            $first: "$orderTotal"
          },
          totalKgInOrder: {
            $sum: {
              $multiply: ["$itemWeight", "$itemQty"]
            }
          }
        }
      },
      {
        $group: {
          _id: "$email",
          totalKg: {
            $sum: "$totalKgInOrder"
          },
          totalSpentMonth: {
            $sum: "$orderTotal"
          }
        }
      },

      {
        $project: {
          totalKg: 1,
          totalSpentMonth: 1,
          spendingCategory: {
            $switch: {
              branches: [
                {
                  case: {
                    $gt: ["$totalKg", 15]
                  },
                  then: "premium"
                },
                {
                  case: {
                    $and: [
                      { $gt: ["$totalKg", 5] },
                      { $lte: ["$totalKg", 15] }
                    ]
                  },
                  then: "standard"
                }
              ],
              default: "basic"
            }
          }
        }
      }
    ]);


    const totalClients = behaviorAggregation.length;
    const totalSpent = behaviorAggregation.reduce((acc, u) => acc + (u.totalSpent || 0), 0);
    const totalOrders = behaviorAggregation.reduce((acc, u) => acc + (u.orderCount || 0), 0);

    const behaviorStats = [
      { category: 'active', count: 0, totalSpent: 0 },
      { category: 'recovered', count: 0, totalSpent: 0 },
      { category: 'new', count: 0, totalSpent: 0 },
      { category: 'tracking', count: 0, totalSpent: 0 },
      { category: 'recompra', count: 0, totalSpent: 0 },
      { category: 'no-recompra', count: 0, totalSpent: 0 },
      { category: 'possible-inactive', count: 0, totalSpent: 0 },
      { category: 'lost', count: 0, totalSpent: 0 },
    ];

    behaviorAggregation.forEach(u => {
      const stat = behaviorStats.find(s => s.category === u.behaviorCategory);
      if (stat) {
        stat.count++;
        stat.totalSpent += u.totalSpent;
      }
    });

    const spendingStats = [
      { category: 'premium', count: 0, totalSpent: 0 },
      { category: 'standard', count: 0, totalSpent: 0 },
      { category: 'basic', count: 0, totalSpent: 0 },
    ];


    spendingAggregation.forEach(s => {
      const stat = spendingStats.find(st => st.category === s.spendingCategory);
      if (stat) {
        stat.count++;
        stat.totalSpent += s.totalSpentMonth;
      }
    });

    const averageOrdersPerCustomer = totalClients > 0 ? totalOrders / totalClients : 0;
    const repeatCustomerRate = totalClients > 0 ? (behaviorAggregation.filter(u => u.orderCount > 1).length / totalClients) * 100 : 0;
    const averageMonthlySpending = totalSpent / (totalClients || 1);



    return {
      totalClients,
      summary: {
        averageMonthlySpending,
        repeatCustomerRate,
        averageOrdersPerCustomer,
      },
      behaviorCategories: behaviorStats.map(s => ({
        ...s,
        percentage: totalClients > 0 ? Math.round((s.count / totalClients) * 100) : 0,
        averageSpending: s.count > 0 ? s.totalSpent / s.count : 0
      })),
      spendingCategories: spendingStats.map(s => ({
        ...s,
        percentage: totalClients > 0 ? Math.round((s.count / totalClients) * 100) : 0,
        averageSpending: s.count > 0 ? s.totalSpent / s.count : 0
      }))
    };
  }

}
