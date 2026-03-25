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

  async getClientAnalytics() {
    const now = new Date();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(now.getDate() - 90);
    const oneTwentyDaysAgo = new Date();
    oneTwentyDaysAgo.setDate(now.getDate() - 120);
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
                  120
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
                      { $gte: ['$lastOrderDate', thirtyDaysAgo] }
                    ]
                  },
                  then: 'tracking'
                },
                {
                  case: { $eq: ['$isRecovered', true] },
                  then: 'recovered'
                },
                {
                  case: { $gte: ['$lastOrderDate', ninetyDaysAgo] },
                  then: 'active'
                },
                {
                  case: {
                    $and: [
                      { $lt: ['$lastOrderDate', ninetyDaysAgo] },
                      { $gte: ['$lastOrderDate', oneTwentyDaysAgo] }
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
