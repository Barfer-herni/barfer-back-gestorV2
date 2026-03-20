import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { Order } from '../../schemas/order.schema';
import { User } from '../../schemas/user.schema';
import { Product } from '../../schemas/product.schema';
import { PaymentsGestor } from '../../schemas/payments-gestor.schema';
import { Salidas } from '../../schemas/salidas.schema';
import { calculateItemWeight } from '../../common/utils/weightUtils';
import * as moment from 'moment';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    @InjectModel(PaymentsGestor.name) private readonly paymentsGestorModel: Model<PaymentsGestor>,
    @InjectModel(Salidas.name) private readonly salidasModel: Model<Salidas>,
  ) { }

  async getAverageOrderValue(): Promise<any> {
    const pipeline: PipelineStage[] = [
      { $match: { status: 'confirmed' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          totalOrders: { $sum: 1 },
        },
      },
    ];

    const result = await this.orderModel.aggregate(pipeline);

    if (result.length === 0) {
      return { averageOrderValue: 0, totalOrders: 0, totalRevenue: 0 };
    }

    const { totalRevenue, totalOrders } = result[0];
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      averageOrderValue: Math.round(averageOrderValue),
      totalOrders,
      totalRevenue,
    };
  }

  async getCategorySales(statusFilter: string = 'all', limit: number = 10, startDate?: string, endDate?: string): Promise<any> {
    const matchCondition: any = {};
    if (statusFilter !== 'all') {
      matchCondition.status = statusFilter;
    }
    if (startDate || endDate) {
      matchCondition.createdAt = {};
      if (startDate) matchCondition.createdAt.$gte = new Date(startDate);
      if (endDate) matchCondition.createdAt.$lte = new Date(endDate);
    }

    const pipeline: PipelineStage[] = [];
    if (Object.keys(matchCondition).length > 0) {
      pipeline.push({ $match: matchCondition });
    }
    pipeline.push(
      { $unwind: '$items' },
      { $unwind: '$items.options' },
      {
        $addFields: {
          category: {
            $switch: {
              branches: [
                { case: { $regexMatch: { input: '$items.name', regex: /big dog/i } }, then: 'BIG DOG' },
                { case: { $regexMatch: { input: '$items.name', regex: /huesos/i } }, then: 'HUESOS CARNOSOS' },
                { case: { $regexMatch: { input: '$items.name', regex: /complement/i } }, then: 'COMPLEMENTOS' },
                { case: { $regexMatch: { input: '$items.name', regex: /perro/i } }, then: 'PERRO' },
                { case: { $regexMatch: { input: '$items.name', regex: /gato/i } }, then: 'GATO' },
              ],
              default: 'OTROS',
            },
          },
        },
      },
      {
        $match: {
          category: { $in: ['BIG DOG', 'PERRO', 'GATO', 'HUESOS CARNOSOS', 'COMPLEMENTOS'] },
        },
      },
      {
        $group: {
          _id: '$category',
          totalQuantity: { $sum: '$items.options.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.options.quantity', '$items.options.price'] } },
          orderCount: { $sum: 1 },
          uniqueProducts: { 
            $addToSet: { 
              $concat: [
                { $toUpper: '$items.name' }, 
                "-", 
                { $toUpper: { $ifNull: ['$items.options.name', ''] } }
              ] 
            } 
          },
          avgPrice: { $avg: '$items.options.price' },
          items: {
            $push: {
              quantity: '$items.options.quantity',
              productName: '$items.name',
              optionName: '$items.options.name',
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          totalQuantity: 1,
          totalRevenue: 1,
          orderCount: 1,
          uniqueProducts: { $size: '$uniqueProducts' },
          avgPrice: 1,
          items: 1,
        },
      },
      { $sort: { totalQuantity: -1 } as any },
      { $limit: limit },
    );

    const result = await this.orderModel.aggregate(pipeline);

    const formattedResult = result.map((item: any) => {
      const totalWeight = item.items.reduce((acc: number, productItem: any) => {
        const weight = calculateItemWeight(productItem.productName, productItem.optionName);
        return acc + weight * productItem.quantity;
      }, 0);

      // Canonical processing for unique products
      let uniqueProductsCount = item.uniqueProducts;
      
      if (item._id === 'PERRO') {
        const products = new Set();
        item.items.forEach((p: any) => {
           const name = (p.productName || '').toUpperCase();
           const option = (p.optionName || '').toUpperCase();
           let flavor = 'OTROS';
           if (name.includes('POLLO') || option.includes('POLLO')) flavor = 'POLLO';
           else if (name.includes('VACA') || option.includes('VACA')) flavor = 'VACA';
           else if (name.includes('CERDO') || option.includes('CERDO')) flavor = 'CERDO';
           else if (name.includes('CORDERO') || option.includes('CORDERO')) flavor = 'CORDERO';
           
           let size = '5KG';
           if (name.includes('10KG') || name.includes('10 KG') || option.includes('10KG') || option.includes('10 KG')) size = '10KG';
           
           products.add(`${flavor}-${size}`);
        });
        uniqueProductsCount = products.size;
      } else if (item._id === 'GATO') {
        const products = new Set();
        item.items.forEach((p: any) => {
           const name = (p.productName || '').toUpperCase();
           const option = (p.optionName || '').toUpperCase();
           let flavor = 'OTROS';
           if (name.includes('POLLO') || option.includes('POLLO')) flavor = 'POLLO';
           else if (name.includes('VACA') || option.includes('VACA')) flavor = 'VACA';
           else if (name.includes('CERDO') || option.includes('CERDO')) flavor = 'CERDO';
           else if (name.includes('CORDERO') || option.includes('CORDERO')) flavor = 'CORDERO';
           products.add(flavor);
        });
        uniqueProductsCount = products.size;
      } else if (item._id === 'BIG DOG') {
        const products = new Set();
        item.items.forEach((p: any) => {
           const name = (p.productName || '').toUpperCase();
           const option = (p.optionName || '').toUpperCase();
           let flavor = 'OTROS';
           if (name.includes('POLLO') || option.includes('POLLO')) flavor = 'POLLO';
           else if (name.includes('VACA') || option.includes('VACA')) flavor = 'VACA';
           else if (name.includes('CERDO') || option.includes('CERDO')) flavor = 'CERDO';
           else if (name.includes('CORDERO') || option.includes('CORDERO')) flavor = 'CORDERO';
           products.add(flavor);
        });
        uniqueProductsCount = products.size;
      } else if (item._id === 'HUESOS CARNOSOS' || item._id === 'COMPLEMENTOS') {
        uniqueProductsCount = 1;
      }

      return {
        categoryName: item._id,
        quantity: item.totalQuantity,
        revenue: item.totalRevenue,
        orders: item.orderCount,
        uniqueProducts: uniqueProductsCount,
        avgPrice: Math.round(item.avgPrice),
        statusFilter: statusFilter || 'all',
        totalWeight: totalWeight > 0 ? totalWeight : null,
      };
    });

    return formattedResult;
  }

  async getClientCategoriesStats(): Promise<any> {
    const pipeline: PipelineStage[] = [
      {
        $match: {
          status: { $in: ['pending', 'confirmed', 'delivered', 'cancelled'] },
        },
      },
      {
        $group: {
          _id: { $ifNull: ['$user.id', '$user.email'] },
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$total' },
          firstOrderDate: { $min: { $toDate: '$createdAt' } },
          lastOrderDate: { $max: { $toDate: '$createdAt' } },
          orderDates: { $push: '$createdAt' },
        },
      },
      {
        $addFields: {
          daysSinceFirstOrder: {
            $divide: [{ $subtract: ['$$NOW', '$firstOrderDate'] }, 1000 * 60 * 60 * 24],
          },
          daysSinceLastOrder: {
            $divide: [{ $subtract: ['$$NOW', '$lastOrderDate'] }, 1000 * 60 * 60 * 24],
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
                      { $eq: ['$totalOrders', 1] },
                      { $lte: ['$daysSinceFirstOrder', 7] },
                    ],
                  },
                  then: 'new',
                },
                {
                  case: { $gt: ['$daysSinceLastOrder', 120] },
                  then: 'lost',
                },
              ],
              default: 'active',
            },
          },
        },
      },
      {
        $group: {
          _id: '$behaviorCategory',
          count: { $sum: 1 },
          totalSpent: { $sum: '$totalSpent' },
        },
      },
    ];

    const behaviorResults = await this.orderModel.aggregate(pipeline);

    return {
      behaviorCategories: behaviorResults.map(r => ({
        category: r._id,
        count: r.count,
        totalSpent: r.totalSpent,
        averageSpending: Math.round(r.totalSpent / r.count)
      })),
      spendingCategories: [] // Simplified for migration
    };
  }

  async getClientCategorization(): Promise<any> {
    // This is similar to getClientCategoriesStats but returns details or a different view
    return this.getClientCategoriesStats();
  }

  async getClientGeneralStats(): Promise<any> {
    const pipeline: PipelineStage[] = [
      {
        $match: {
          status: { $in: ['pending', 'confirmed', 'delivered', 'cancelled'] },
        },
      },
      {
        $group: {
          _id: { $ifNull: ['$user.id', '$user.email'] },
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$total' },
          firstOrderDate: { $min: { $toDate: '$createdAt' } },
        },
      },
      {
        $group: {
          _id: null,
          totalClients: { $sum: 1 },
          totalOrders: { $sum: '$totalOrders' },
          totalSpent: { $sum: '$totalSpent' },
          repeatCustomers: {
            $sum: { $cond: [{ $gt: ['$totalOrders', 1] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalClients: 1,
          averageOrderValue: { $divide: ['$totalSpent', '$totalOrders'] },
          repeatCustomerRate: {
            $multiply: [{ $divide: ['$repeatCustomers', '$totalClients'] }, 100],
          },
          averageOrdersPerCustomer: { $divide: ['$totalOrders', '$totalClients'] },
        },
      },
    ];

    const result = await this.orderModel.aggregate(pipeline);
    if (!result[0]) return { totalClients: 0, averageOrderValue: 0, repeatCustomerRate: 0, averageOrdersPerCustomer: 0 };

    return {
      ...result[0],
      averageOrderValue: Math.round(result[0].averageOrderValue),
      repeatCustomerRate: Math.round(result[0].repeatCustomerRate * 100) / 100,
      averageOrdersPerCustomer: Math.round(result[0].averageOrdersPerCustomer * 10) / 10,
    };
  }

  async getClientsByCategory(): Promise<any> {
    // Simplified for now
    return [];
  }

  async getClientsPaginated(page: number = 1, limit: number = 20): Promise<any> {
    const skip = (page - 1) * limit;
    const clients = await this.userModel.find().skip(skip).limit(limit).lean();
    const total = await this.userModel.countDocuments();
    return { clients, total, page, limit };
  }

  async getCustomerFrequency(): Promise<any> {
    const pipeline: PipelineStage[] = [
      { $match: { status: 'confirmed' } },
      {
        $group: {
          _id: { $ifNull: ['$user.id', '$user.email'] },
          orderCount: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$orderCount',
          customerCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 as const } }
    ];
    return this.orderModel.aggregate(pipeline);
  }

  async getCustomerInsights(startDate?: string, endDate?: string): Promise<any> {
    const matchCondition: any = { status: { $in: ['confirmed', 'delivered'] } };
    if (startDate || endDate) {
      matchCondition.createdAt = {};
      if (startDate) matchCondition.createdAt.$gte = new Date(startDate);
      if (endDate) matchCondition.createdAt.$lte = new Date(endDate);
    }

    const pipeline: PipelineStage[] = [
      { $match: matchCondition },
      {
        $group: {
          _id: { $ifNull: ['$user.id', '$user.email'] },
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$total' }
        }
      },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          totalOrders: { $sum: '$orderCount' },
          totalRevenue: { $sum: '$totalSpent' },
          customersWithMultipleOrders: { $sum: { $cond: [{ $gt: ['$orderCount', 1] }, 1, 0] } }
        }
      }
    ];

    const results = await this.orderModel.aggregate(pipeline);
    if (!results.length) {
      return {
        averageOrderValue: 0,
        averageOrdersPerCustomer: 0,
        totalCustomers: 0,
        totalOrders: 0,
        totalRevenue: 0,
        averageSpentPerCustomer: 0,
        repeatCustomerRate: 0,
        customersWithMultipleOrders: 0
      };
    }

    const data = results[0];
    const totalCustomers = data.totalCustomers;
    const totalOrders = data.totalOrders;
    const totalRevenue = data.totalRevenue;
    const customersWithMultipleOrders = data.customersWithMultipleOrders;

    return {
      averageOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
      averageOrdersPerCustomer: totalCustomers > 0 ? Number((totalOrders / totalCustomers).toFixed(1)) : 0,
      totalCustomers,
      totalOrders,
      totalRevenue,
      averageSpentPerCustomer: totalCustomers > 0 ? Math.round(totalRevenue / totalCustomers) : 0,
      repeatCustomerRate: totalCustomers > 0 ? Number(((customersWithMultipleOrders / totalCustomers) * 100).toFixed(1)) : 0,
      customersWithMultipleOrders
    };
  }

  async getDeliveryTypeStatsByMonth(): Promise<any> {
    const pipeline: PipelineStage[] = [
      {
        $match: {
          status: { $in: ['confirmed', 'pending', 'delivered'] }
        }
      },
      {
        $project: {
          total: 1,
          status: 1,
          createdAt: 1,
          items: 1,
          orderType: 1,
          paymentMethod: 1,
          'deliveryArea.sameDayDelivery': 1,
          monthKey: {
            $dateToString: { format: '%Y-%m', date: { $toDate: '$createdAt' } }
          },
          deliveryCategory: {
            $cond: [
              { $eq: ['$orderType', 'mayorista'] },
              'wholesale',
              {
                $cond: [
                  {
                    $or: [
                      { $eq: ['$deliveryArea.sameDayDelivery', true] },
                      { $in: ['$paymentMethod', ['bank-transfer', 'transfer']] }
                    ]
                  },
                  'sameDay',
                  'normal'
                ]
              }
            ]
          }
        }
      }
    ];

    const orders = await this.orderModel.aggregate(pipeline);

    // Process in JS to handle weight calculation using the utility
    const statsMap = new Map<string, any>();

    orders.forEach(order => {
      const month = order.monthKey;
      if (!statsMap.has(month)) {
        statsMap.set(month, {
          month,
          sameDayOrders: 0,
          normalOrders: 0,
          wholesaleOrders: 0,
          sameDayRevenue: 0,
          normalRevenue: 0,
          wholesaleRevenue: 0,
          sameDayWeight: 0,
          normalWeight: 0,
          wholesaleWeight: 0
        });
      }

      const stats = statsMap.get(month);
      const category = order.deliveryCategory;
      const isConfirmed = ['confirmed', 'delivered'].includes(order.status);

      // Count orders (all statuses)
      if (category === 'sameDay') stats.sameDayOrders++;
      else if (category === 'wholesale') stats.wholesaleOrders++;
      else stats.normalOrders++;

      // Revenue and Weight (only confirmed/delivered?) 
      // Most analytics show revenue for confirmed only to avoid noise
      if (isConfirmed) {
        const revenue = order.total || 0;
        let weight = 0;

        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
            if (item.options && Array.isArray(item.options)) {
              item.options.forEach((opt: any) => {
                const itemWeight = calculateItemWeight(item.name, opt.name);
                weight += itemWeight * (opt.quantity || 1);
              });
            } else {
              const itemWeight = calculateItemWeight(item.name, '');
              weight += itemWeight * (item.quantity || 1);
            }
          });
        }

        if (category === 'sameDay') {
          stats.sameDayRevenue += revenue;
          stats.sameDayWeight += weight;
        } else if (category === 'wholesale') {
          stats.wholesaleRevenue += revenue;
          stats.wholesaleWeight += weight;
        } else {
          stats.normalRevenue += revenue;
          stats.normalWeight += weight;
        }
      }
    });

    // Format weights to 1 decimal place and return sorted array
    return Array.from(statsMap.values())
      .map(s => ({
        ...s,
        sameDayWeight: Math.round(s.sameDayWeight * 10) / 10,
        normalWeight: Math.round(s.normalWeight * 10) / 10,
        wholesaleWeight: Math.round(s.wholesaleWeight * 10) / 10
      }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }

  async getOrdersByDay(startDate?: string, endDate?: string): Promise<any> {
    const match: any = { status: { $in: ['confirmed', 'pending', 'delivered'] } };
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }
    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $group: {
          _id: {
            year: { $year: { $toDate: '$createdAt' } },
            month: { $month: { $toDate: '$createdAt' } },
            day: { $dayOfMonth: { $toDate: '$createdAt' } }
          },
          orderCount: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      },
      { $sort: { '_id.year': 1 as const, '_id.month': 1 as const, '_id.day': 1 as const } }
    ];
    const results = await this.orderModel.aggregate(pipeline);
    return results.map(item => ({
      date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
      orders: item.orderCount,
      revenue: item.revenue
    }));
  }

  async getOrdersByMonth(): Promise<any> {
    const pipeline: PipelineStage[] = [
      { $match: { status: { $in: ['confirmed', 'pending', 'delivered'] } } },
      {
        $group: {
          _id: {
            year: { $year: { $toDate: '$createdAt' } },
            month: { $month: { $toDate: '$createdAt' } }
          },
          orderCount: { $sum: 1 },
          revenue: { $sum: { $cond: [{ $in: ['$status', ['confirmed', 'delivered']] }, '$total', 0] } },
          uniqueCustomersSet: { $addToSet: { $ifNull: ['$user.id', '$user.email'] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } as any }
    ];
    const results = await this.orderModel.aggregate(pipeline);

    return results.map(item => {
      const year = item._id.year;
      const monthStr = item._id.month.toString().padStart(2, '0');
      return {
        month: `${year}-${monthStr}`,
        orders: item.orderCount,
        revenue: item.revenue,
        uniqueCustomers: item.uniqueCustomersSet ? item.uniqueCustomersSet.length : 0
      };
    });
  }

  async getPaymentMethodStats(startDate?: string, endDate?: string): Promise<any> {
    const matchCondition: any = {
      status: { $in: ['confirmed', 'pending', 'delivered'] },
      // paymentMethod: { $ne: 'bank-transfer' }
    };

    if (startDate || endDate) {
      matchCondition.createdAt = {};
      if (startDate) matchCondition.createdAt.$gte = new Date(startDate);
      if (endDate) matchCondition.createdAt.$lte = new Date(endDate);
    }

    const pipeline: PipelineStage[] = [
      { $match: matchCondition },
      {
        $addFields: {
          paymentMethod: {
            $cond: [
              {
                $and: [
                  { $eq: ['$paymentMethod', 'bank-transfer'] },
                  { $gte: [{ $toDate: '$createdAt' }, new Date('2026-01-01')] }
                ]
              },
              'mercado-pago',
              '$paymentMethod'
            ]
          }
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          totalCount: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          confirmedCount: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
          confirmedRevenue: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, '$total', 0] } },
          pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          pendingRevenue: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$total', 0] } }
        }
      }
    ];

    const results = await this.orderModel.aggregate(pipeline);

    const totalOrders = results.reduce((sum, item) => sum + item.totalCount, 0);
    const totalRevenue = results.reduce((sum, item) => sum + item.totalRevenue, 0);
    const totalConfirmedOrders = results.reduce((sum, item) => sum + item.confirmedCount, 0);
    const totalConfirmedRevenue = results.reduce((sum, item) => sum + item.confirmedRevenue, 0);
    const totalPendingOrders = results.reduce((sum, item) => sum + item.pendingCount, 0);
    const totalPendingRevenue = results.reduce((sum, item) => sum + item.pendingRevenue, 0);

    const paymentMethods = results.map(item => ({
      paymentMethod: item._id || 'unknown',
      totalCount: item.totalCount,
      totalRevenue: item.totalRevenue,
      totalPercentage: totalOrders > 0 ? (item.totalCount / totalOrders) * 100 : 0,
      confirmedCount: item.confirmedCount,
      confirmedRevenue: item.confirmedRevenue,
      confirmedPercentage: item.totalCount > 0 ? (item.confirmedCount / item.totalCount) * 100 : 0,
      pendingCount: item.pendingCount,
      pendingRevenue: item.pendingRevenue,
      pendingPercentage: item.totalCount > 0 ? (item.pendingCount / item.totalCount) * 100 : 0,
      revenuePercentage: totalRevenue > 0 ? (item.totalRevenue / totalRevenue) * 100 : 0,
    }));

    // Sort by total revenue descending
    paymentMethods.sort((a, b) => b.totalRevenue - a.totalRevenue);

    return {
      paymentMethods,
      totalOrders,
      totalRevenue,
      totalConfirmedOrders,
      totalConfirmedRevenue,
      totalPendingOrders,
      totalPendingRevenue
    };
  }

  async getPaymentsByTimePeriod(startDate: string, endDate: string, periodType: string = 'daily'): Promise<any> {
    const pipeline: PipelineStage[] = [
      {
        $match: {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      },
      {
        $addFields: {
          paymentMethod: {
            $cond: [
              {
                $and: [
                  { $eq: ['$paymentMethod', 'bank-transfer'] },
                  { $gte: [{ $toDate: '$createdAt' }, new Date('2026-01-01')] }
                ]
              },
              'mercado-pago',
              '$paymentMethod'
            ]
          }
        }
      }
    ];

    let groupId: any;
    switch (periodType) {
      case 'daily':
        groupId = { year: { $year: { $toDate: '$createdAt' } }, month: { $month: { $toDate: '$createdAt' } }, day: { $dayOfMonth: { $toDate: '$createdAt' } } };
        break;
      case 'weekly':
        groupId = { year: { $year: { $toDate: '$createdAt' } }, week: { $week: { $toDate: '$createdAt' } } };
        break;
      case 'monthly':
        groupId = { year: { $year: { $toDate: '$createdAt' } }, month: { $month: { $toDate: '$createdAt' } } };
        break;
    }

    pipeline.push({
      $group: {
        _id: groupId,
        efectivoOrders: { $sum: { $cond: [{ $eq: ['$paymentMethod', 'cash'] }, 1, 0] } },
        efectivoRevenue: { $sum: { $cond: [{ $eq: ['$paymentMethod', 'cash'] }, '$total', 0] } },
        transferenciaOrders: { $sum: { $cond: [{ $eq: ['$paymentMethod', 'bank-transfer'] }, 1, 0] } },
        transferenciaRevenue: { $sum: { $cond: [{ $eq: ['$paymentMethod', 'bank-transfer'] }, '$total', 0] } },
        tarjetaOrders: { $sum: { $cond: [{ $eq: ['$paymentMethod', 'mercado-pago'] }, 1, 0] } },
        tarjetaRevenue: { $sum: { $cond: [{ $eq: ['$paymentMethod', 'mercado-pago'] }, '$total', 0] } },
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$total' }
      }
    });

    pipeline.push({ $sort: { '_id.year': 1 as const, '_id.month': 1 as const, '_id.day': 1 as const } });

    const result = await this.orderModel.aggregate(pipeline);
    return result.map(item => {
      let period = '';
      if (periodType === 'daily') period = `${item._id.year}-${item._id.month}-${item._id.day}`;
      if (periodType === 'weekly') period = `${item._id.year}-W${item._id.week}`;
      if (periodType === 'monthly') period = `${item._id.year}-${item._id.month}`;

      return { ...item, period };
    });
  }

  async getProductSales(statusFilter: string = 'all', limit: number = 50, startDate?: string, endDate?: string): Promise<any> {
    const match: any = {};
    if (statusFilter !== 'all') match.status = statusFilter;
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }
    const pipeline: PipelineStage[] = [
      { $match: match },
      { $unwind: '$items' },
      { $unwind: '$items.options' },
      {
        $match: {
          'items.name': {
            $regex: /pollo|vaca|cerdo|cordero|big dog|huesos|carnosos/i
          },
          $and: [
            { 'items.name': { $not: /garra|oreja|traquea|cornalito|caldo|complemento|\d+\s*GRS/i } },
            { 'items.options.name': { $not: /garra|oreja|traquea|cornalito|caldo|complemento|\d+\s*GRS/i } }
          ]
        }
      },
      {
        $group: {
          _id: {
            productName: { $toUpper: '$items.name' },
            optionName: { $toUpper: '$items.options.name' }
          },
          totalQuantity: { $sum: '$items.options.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.options.quantity', '$items.options.price'] } },
          orderCount: { $sum: 1 },
          avgPrice: { $avg: '$items.options.price' },
          // Usamos uno de los IDs reales solo como referencia si fuera necesario, 
          // pero el productId que devolvemos será sintético para asegurar consistencia
          realProductId: { $first: '$items.id' }
        }
      },
      { $sort: { totalQuantity: -1 } as any },
      { $limit: limit }
    ];

    const result = await this.orderModel.aggregate(pipeline);
    return result.map(item => {
      const weight = calculateItemWeight(item._id.productName, item._id.optionName);
      const syntheticId = `${item._id.productName}###${item._id.optionName}`;

      return {
        productId: syntheticId,
        productName: item._id.productName,
        optionName: item._id.optionName,
        quantity: item.totalQuantity,
        revenue: item.totalRevenue,
        orders: item.orderCount,
        avgPrice: Math.round(item.avgPrice),
        totalWeight: weight > 0 ? weight * item.totalQuantity : null
      };
    });
  }

  async getProductsByTimePeriod(startDate: string, endDate: string): Promise<any> {
    const start = moment(startDate).toDate();
    const end = moment(endDate).toDate();
    const daysDiff = moment(end).diff(moment(start), 'days');

    let groupBy: any;
    if (daysDiff <= 31) {
      groupBy = { year: { $year: { $toDate: '$createdAt' } }, month: { $month: { $toDate: '$createdAt' } }, day: { $dayOfMonth: { $toDate: '$createdAt' } } };
    } else if (daysDiff <= 90) {
      groupBy = { year: { $year: { $toDate: '$createdAt' } }, week: { $week: { $toDate: '$createdAt' } } };
    } else {
      groupBy = { year: { $year: { $toDate: '$createdAt' } }, month: { $month: { $toDate: '$createdAt' } } };
    }

    const pipeline: PipelineStage[] = [
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: { $in: ['pending', 'confirmed'] },
        },
      },
      { $unwind: '$items' },
      { $unwind: '$items.options' },
      {
        $addFields: {
          productCategory: {
            $switch: {
              branches: [
                { case: { $regexMatch: { input: '$items.name', regex: /big dog/i } }, then: 'bigDog' },
                { case: { $regexMatch: { input: '$items.name', regex: /perro/i } }, then: 'perro' },
                { case: { $regexMatch: { input: '$items.name', regex: /gato/i } }, then: 'gato' },
                { case: { $regexMatch: { input: '$items.name', regex: /huesos/i } }, then: 'huesos' },
                { case: { $regexMatch: { input: '$items.name', regex: /complement/i } }, then: 'complementos' },
              ],
              default: 'otros',
            },
          },
        },
      },
      {
        $group: {
          _id: groupBy,
          bigDogQuantity: { $sum: { $cond: [{ $eq: ['$productCategory', 'bigDog'] }, '$items.options.quantity', 0] } },
          bigDogRevenue: { $sum: { $cond: [{ $eq: ['$productCategory', 'bigDog'] }, { $multiply: ['$items.options.quantity', '$items.options.price'] }, 0] } },
          perroQuantity: { $sum: { $cond: [{ $eq: ['$productCategory', 'perro'] }, '$items.options.quantity', 0] } },
          perroRevenue: { $sum: { $cond: [{ $eq: ['$productCategory', 'perro'] }, { $multiply: ['$items.options.quantity', '$items.options.price'] }, 0] } },
          gatoQuantity: { $sum: { $cond: [{ $eq: ['$productCategory', 'gato'] }, '$items.options.quantity', 0] } },
          gatoRevenue: { $sum: { $cond: [{ $eq: ['$productCategory', 'gato'] }, { $multiply: ['$items.options.quantity', '$items.options.price'] }, 0] } },
          huesosQuantity: { $sum: { $cond: [{ $eq: ['$productCategory', 'huesos'] }, '$items.options.quantity', 0] } },
          huesosRevenue: { $sum: { $cond: [{ $eq: ['$productCategory', 'huesos'] }, { $multiply: ['$items.options.quantity', '$items.options.price'] }, 0] } },
          complementosQuantity: { $sum: { $cond: [{ $eq: ['$productCategory', 'complementos'] }, '$items.options.quantity', 0] } },
          complementosRevenue: { $sum: { $cond: [{ $eq: ['$productCategory', 'complementos'] }, { $multiply: ['$items.options.quantity', '$items.options.price'] }, 0] } },
          totalQuantity: { $sum: '$items.options.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.options.quantity', '$items.options.price'] } },
        },
      },
      { $sort: { '_id.year': 1 as const, '_id.month': 1 as const, '_id.day': 1 as const, '_id.week': 1 as const } },
    ];

    return this.orderModel.aggregate(pipeline);
  }

  async getProductTimeline(startDate: string, endDate: string, productIds?: string[]): Promise<any> {
    const start = moment(startDate).toDate();
    const end = moment(endDate).toDate();
    const diffDays = moment(end).diff(moment(start), 'days');

    let periodFormat: string;
    if (diffDays <= 31) periodFormat = '%Y-%m-%d';
    else if (diffDays <= 90) periodFormat = '%Y-%U';
    else periodFormat = '%Y-%m';

    const matchStage: any = {
      createdAt: { $gte: start, $lte: end },
      status: { $in: ['confirmed', 'pending'] },
    };

    if (productIds && productIds.length > 0) {
      const filters = productIds.map(id => {
        if (id.includes('###')) {
          const [name, option] = id.split('###');
          return { 'items.name': name, 'items.options.name': option };
        }
        return { 'items.id': id }; // Fallback para IDs antiguos si los hubiera
      });
      matchStage.$or = filters;
    }

    const pipeline: PipelineStage[] = [
      { $match: matchStage },
      { $unwind: '$items' },
      { $unwind: '$items.options' },
      // Filtro para incluir solo productos relevantes y excluir los no deseados
      {
        $match: {
          'items.name': {
            $regex: /pollo|vaca|cerdo|cordero|big dog|huesos|carnosos/i
          },
          $and: [
            { 'items.name': { $not: /garra|oreja|traquea|cornalito|caldo|complemento|\d+\s*GRS/i } },
            { 'items.options.name': { $not: /garra|oreja|traquea|cornalito|caldo|complemento|\d+\s*GRS/i } }
          ]
        }
      },
      {
        $group: {
          _id: {
            period: { $dateToString: { format: periodFormat, date: { $toDate: '$createdAt' } } },
            productName: { $toUpper: '$items.name' },
            optionName: { $toUpper: '$items.options.name' },
          },
          totalQuantity: { $sum: '$items.options.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.options.price', '$items.options.quantity'] } },
          confirmedQuantity: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, '$items.options.quantity', 0] } },
          confirmedRevenue: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, { $multiply: ['$items.options.price', '$items.options.quantity'] }, 0] } },
        },
      },
      {
        $group: {
          _id: '$_id.period',
          products: {
            $push: {
              productId: { $concat: ['$_id.productName', '###', '$_id.optionName'] },
              productName: '$_id.productName',
              optionName: '$_id.optionName',
              totalQuantity: '$totalQuantity',
              totalRevenue: '$totalRevenue',
              confirmedQuantity: '$confirmedQuantity',
              confirmedRevenue: '$confirmedRevenue',
            },
          },
          totalQuantity: { $sum: '$totalQuantity' },
          totalRevenue: { $sum: '$totalRevenue' },
          confirmedQuantity: { $sum: '$confirmedQuantity' },
          confirmedRevenue: { $sum: '$confirmedRevenue' },
        },
      },
      { $sort: { _id: 1 as const } },
      {
        $project: {
          _id: 0,
          period: '$_id',
          products: 1,
          totalQuantity: 1,
          totalRevenue: 1,
          confirmedQuantity: 1,
          confirmedRevenue: 1,
        },
      },
    ];

    return this.orderModel.aggregate(pipeline);
  }

  async getPurchaseFrequency(startDate?: string, endDate?: string): Promise<any> {
    const matchCondition: any = { status: { $in: ['confirmed', 'delivered'] } };
    if (startDate || endDate) {
      matchCondition.createdAt = {};
      if (startDate) matchCondition.createdAt.$gte = new Date(startDate);
      if (endDate) matchCondition.createdAt.$lte = new Date(endDate);
    }

    const pipeline: PipelineStage[] = [
      { $match: matchCondition },
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: { $ifNull: ['$user.id', '$user.email'] },
          dates: { $push: '$createdAt' }
        }
      },
      {
        $project: {
          _id: 1,
          dates: 1,
          dateCount: { $size: '$dates' }
        }
      },
      {
        $match: { dateCount: { $gt: 1 } }
      }
    ];

    const results = await this.orderModel.aggregate(pipeline);

    if (!results.length) {
      return { avgFrequencyDays: 0 };
    }

    let totalDiffDays = 0;
    let diffCount = 0;

    results.forEach(customer => {
      const dates = customer.dates;
      for (let i = 1; i < dates.length; i++) {
        const d1 = new Date(dates[i - 1]).getTime();
        const d2 = new Date(dates[i]).getTime();
        const diffMs = Math.abs(d2 - d1);
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        totalDiffDays += diffDays;
        diffCount++;
      }
    });

    const avgFrequencyDays = diffCount > 0 ? Number((totalDiffDays / diffCount).toFixed(1)) : 0;

    return {
      avgFrequencyDays
    };
  }

  async getQuantityStatsByMonth(startDate?: string, endDate?: string, puntoEnvio?: string): Promise<any> {
    const matchCondition: any = {};
    if (startDate || endDate) {
      matchCondition.createdAt = {};
      if (startDate) matchCondition.createdAt.$gte = new Date(startDate);
      if (endDate) matchCondition.createdAt.$lte = new Date(endDate);
    }
    if (puntoEnvio && puntoEnvio !== 'all') {
      matchCondition.puntoEnvio = puntoEnvio;
    }

    const pipeline: PipelineStage[] = [
      { $match: matchCondition },
      { $unwind: '$items' },
      { $unwind: '$items.options' },
      {
        $group: {
          _id: {
            year: { $year: { $toDate: '$createdAt' } },
            month: { $month: { $toDate: '$createdAt' } },
            orderType: { $ifNull: ['$orderType', 'minorista'] },
            sameDayDelivery: '$deliveryArea.sameDayDelivery',
            puntoEnvio: { $ifNull: ['$deliveryArea.puntoEnvio', '$puntoEnvio'] },
            productName: '$items.name',
            optionName: '$items.options.name'
          },
          totalQuantity: { $sum: '$items.options.quantity' },
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } as any }
    ];

    const results = await this.orderModel.aggregate(pipeline);

    const stats: any = { minorista: [], sameDay: [], mayorista: [] };

    const getMonthEntry = (array: any[], monthKey: string) => {
      let entry = array.find(m => m.month === monthKey);
      if (!entry) {
        entry = {
          month: monthKey, pollo: 0, vaca: 0, cerdo: 0, cordero: 0,
          bigDogPollo: 0, bigDogVaca: 0, totalPerro: 0,
          gatoPollo: 0, gatoVaca: 0, gatoCordero: 0, totalGato: 0,
          huesosCarnosos: 0, totalMes: 0
        };
        array.push(entry);
      }
      return entry;
    };

    results.forEach(item => {
      const year = item._id.year;
      const month = item._id.month.toString().padStart(2, '0');
      const monthKey = `${year}-${month}`;
      const orderType = (item._id.orderType || 'minorista').toLowerCase();

      let targetList = stats.minorista;
      if (item._id.sameDayDelivery || item._id.puntoEnvio) {
        targetList = stats.sameDay;
      } else if (orderType === 'mayorista') {
        targetList = stats.mayorista;
      }

      const entry = getMonthEntry(targetList, monthKey);

      // USAMOS LA UTILITY ORIGINAL PARA PRECISIÓN DEL 100%
      const weight = calculateItemWeight(item._id.productName, item._id.optionName);
      const totalWeight = weight * item.totalQuantity;

      const productName = item._id.productName.toUpperCase();
      const optionName = (item._id.optionName || '').toUpperCase();

      if (productName.includes('BIG DOG')) {
        if (optionName.includes('POLLO')) entry.bigDogPollo += totalWeight;
        else if (optionName.includes('VACA')) entry.bigDogVaca += totalWeight;
        entry.totalPerro += totalWeight;
      } else if (productName.includes('HUESOS') || productName.includes('CARNOSOS')) {
        entry.huesosCarnosos += totalWeight;
      } else if (productName.includes('PERRO')) {
        if (productName.includes('POLLO')) entry.pollo += totalWeight;
        else if (productName.includes('VACA')) entry.vaca += totalWeight;
        else if (productName.includes('CERDO')) entry.cerdo += totalWeight;
        else if (productName.includes('CORDERO')) entry.cordero += totalWeight;
        entry.totalPerro += totalWeight;
      } else if (productName.includes('GATO')) {
        if (productName.includes('POLLO')) entry.gatoPollo += totalWeight;
        else if (productName.includes('VACA')) entry.gatoVaca += totalWeight;
        else if (productName.includes('CORDERO')) entry.gatoCordero += totalWeight;
        entry.totalGato += totalWeight;
      }

      entry.totalMes += totalWeight;
    });

    const formatEntry = (entry: any) => {
      Object.keys(entry).forEach(key => {
        if (key !== 'month') entry[key] = Math.round(entry[key] * 10) / 10;
      });
    };

    stats.minorista.forEach(formatEntry);
    stats.sameDay.forEach(formatEntry);
    stats.mayorista.forEach(formatEntry);

    return stats;
  }

  async getRevenueByDay(startDate?: string, endDate?: string): Promise<any> {
    const match: any = { status: { $in: ['confirmed', 'delivered'] } };
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }
    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $group: {
          _id: {
            year: { $year: { $toDate: '$createdAt' } },
            month: { $month: { $toDate: '$createdAt' } },
            day: { $dayOfMonth: { $toDate: '$createdAt' } }
          },
          orderCount: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      },
      { $sort: { '_id.year': 1 as const, '_id.month': 1 as const, '_id.day': 1 as const } }
    ];
    const results = await this.orderModel.aggregate(pipeline);
    return results.map(item => ({
      date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
      orders: item.orderCount,
      revenue: item.revenue
    }));
  }
}

export default AnalyticsService;
