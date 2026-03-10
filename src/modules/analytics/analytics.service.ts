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
          uniqueProducts: { $addToSet: '$items.name' },
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

      return {
        categoryName: item._id,
        quantity: item.totalQuantity,
        revenue: item.totalRevenue,
        orders: item.orderCount,
        uniqueProducts: item.uniqueProducts,
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
        $group: {
          _id: {
            year: { $year: { $toDate: '$createdAt' } },
            month: { $month: { $toDate: '$createdAt' } },
            type: '$orderType'
          },
          count: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      },
      { $sort: { '_id.year': -1 as const, '_id.month': -1 as const } }
    ];
    return this.orderModel.aggregate(pipeline);
  }

  async getOrdersByDay(startDate?: string, endDate?: string): Promise<any> {
    const match: any = { status: 'confirmed' };
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
    return this.orderModel.aggregate(pipeline);
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
    const matchCondition: any = { status: { $in: ['confirmed', 'pending'] } };

    if (startDate || endDate) {
      matchCondition.createdAt = {};
      if (startDate) matchCondition.createdAt.$gte = new Date(startDate);
      if (endDate) matchCondition.createdAt.$lte = new Date(endDate);
    }

    const pipeline: PipelineStage[] = [
      { $match: matchCondition },
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
        $group: {
          _id: {
            productId: '$items.id',
            productName: '$items.name',
            optionName: '$items.options.name'
          },
          totalQuantity: { $sum: '$items.options.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.options.quantity', '$items.options.price'] } },
          orderCount: { $sum: 1 },
          avgPrice: { $avg: '$items.options.price' }
        }
      },
      { $sort: { totalQuantity: -1 } as any },
      { $limit: limit }
    ];

    const result = await this.orderModel.aggregate(pipeline);
    return result.map(item => {
      const weight = calculateItemWeight(item._id.productName, item._id.optionName);
      return {
        productId: item._id.productId,
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
      matchStage['items.id'] = { $in: productIds };
    }

    const pipeline: PipelineStage[] = [
      { $match: matchStage },
      { $unwind: '$items' },
      { $unwind: '$items.options' },
      {
        $group: {
          _id: {
            period: { $dateToString: { format: periodFormat, date: { $toDate: '$createdAt' } } },
            productId: '$items.id',
            productName: '$items.name',
            optionName: '$items.options.name',
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
              productId: '$_id.productId',
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
            // puntoEnvio: '$deliveryArea.puntoEnvio',
            puntoEnvio: { $ifNull: ['$deliveryArea.puntoEnvio', '$puntoEnvio'] },
            paymentMethod: '$paymentMethod',
            productName: '$items.name',
            optionName: '$items.options.name'
          },
          totalQuantity: { $sum: '$items.options.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.options.quantity', '$items.options.price'] } }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } as any }
    ];

    const results = await this.orderModel.aggregate(pipeline);

    // Initial structure
    const stats: any = {
      minorista: [],
      sameDay: [],
      mayorista: []
    };

    // Helper to find or create a month entry
    const getMonthEntry = (array: any[], monthKey: string) => {
      let entry = array.find(m => m.month === monthKey);
      if (!entry) {
        entry = {
          month: monthKey,
          pollo: 0, vaca: 0, cerdo: 0, cordero: 0,
          bigDogPollo: 0, bigDogVaca: 0,
          totalPerro: 0,
          gatoPollo: 0, gatoVaca: 0, gatoCordero: 0,
          totalGato: 0,
          huesosCarnosos: 0,
          totalMes: 0
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

      // Determine which target list based on orderType
      let targetList;
      if (item._id.sameDayDelivery || item._id.puntoEnvio) {
        targetList = stats.sameDay;
      }
      else if (orderType === 'mayorista') {
        targetList = stats.mayorista;
      }
      else {
        targetList = stats.minorista;
      }

      const entry = getMonthEntry(targetList, monthKey);

      const weight = calculateItemWeight(item._id.productName, item._id.optionName);
      const totalWeight = weight * item.totalQuantity;

      const productName = item._id.productName.toUpperCase();

      //el sabor del big dog no esta en el productname sino en items.options.name
      if (productName.includes('BIG DOG')) {
        if (item._id.optionName.includes('POLLO')) {
          entry.bigDogPollo += totalWeight;
        } else if (item._id.optionName.includes('VACA')) {
          entry.bigDogVaca += totalWeight;
        }
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

    // Formatting decimals
    const formatEntry = (entry: any) => {
      Object.keys(entry).forEach(key => {
        if (key !== 'month') {
          entry[key] = Math.round(entry[key] * 10) / 10;
        }
      });
    };

    stats.minorista.forEach(formatEntry);
    stats.sameDay.forEach(formatEntry);
    stats.mayorista.forEach(formatEntry);

    // Sort again just in case (though aggregation handled it mostly)
    stats.minorista.sort((a, b) => a.month.localeCompare(b.month));
    stats.sameDay.sort((a, b) => a.month.localeCompare(b.month));
    stats.mayorista.sort((a, b) => a.month.localeCompare(b.month));

    return stats;
  }

  async getRevenueByDay(startDate?: string, endDate?: string): Promise<any> {
    return this.getOrdersByDay(startDate, endDate);
  }
}

export default AnalyticsService;
