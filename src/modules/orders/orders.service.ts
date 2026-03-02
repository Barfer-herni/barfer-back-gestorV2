import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order } from '../../schemas/order.schema';
import { Mayoristas } from '../../schemas/mayoristas.schema';
import { PuntoEnvio } from '../../schemas/punto-envio.schema';
import { Salidas } from '../../schemas/salidas.schema';
import { AddressService } from '../address/address.service';
import { AddressDto } from '../address/dto/address.dto';
import { DeliveryAreasService } from '../delivery-areas/delivery-areas.service';
import { DeliveryAreaDto } from '../delivery-areas/dto/delivery-area.dto';
import { OptionResponseDto } from '../options/dto/option-response.dto';
import { OptionsService } from '../options/options.service';
import { ProductResponseDto } from '../products/dto/product-response.dto';
import { ProductDto } from '../products/dto/product.dto';
import { ProductsService } from '../products/products.service';
import { UserDto } from '../users/dto/user.dto';
import { UsersService } from '../users/users.service';
import { FindOptionsDto } from './dto/find-options.dto';
import { OrderDto } from './dto/order.dto';
import { UpdateOrderDto } from './dto/update.dto';
import { normalizeDeliveryDay, normalizeScheduleTime, processOrderItems } from './orders.helpers';
import { MayoristasService } from '../mayoristas/mayoristas.service';
import { PuntoEnvioService } from '../punto-envio/punto-envio.service';
import { Types } from 'mongoose';
import { GetAllOrdersParams } from './interfaces/gett-all-orders-params';


@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Mayoristas.name) private readonly mayoristasModel: Model<Mayoristas>,
    @InjectModel(Salidas.name) private readonly salidasModel: Model<Salidas>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly usersService: UsersService,
    private readonly productsService: ProductsService,
    private readonly addressService: AddressService,
    private readonly deliveryAreaService: DeliveryAreasService,
    private readonly configService: ConfigService,
    private readonly optionsService: OptionsService,
    private readonly mayoristasService: MayoristasService,
    private readonly puntoEnvioService: PuntoEnvioService,
  ) { }


  async createOrder(data: OrderDto) {
    try {
      const validatedData = data;

      // Normalizar el formato de deliveryDay si está presente
      if (validatedData.deliveryDay) {
        validatedData.deliveryDay = normalizeDeliveryDay(validatedData.deliveryDay);

        // Ajustar fecha según horario de corte (solo para envíos express con punto definido)
        if (validatedData.puntoEnvio) {
          validatedData.deliveryDay = await this.puntoEnvioService.adjustDeliveryDateByCutoff(validatedData.deliveryDay, validatedData.puntoEnvio);
        }
      }

      // Normalizar el formato del schedule si está presente
      if (validatedData.deliveryArea?.schedule) {
        validatedData.deliveryArea.schedule = normalizeScheduleTime(validatedData.deliveryArea.schedule);
      }

      // Procesar items para limpiar campos innecesarios y asegurar formato correcto
      if (validatedData.items && Array.isArray(validatedData.items)) {
        validatedData.items = processOrderItems(validatedData.items);
      }

      const newOrder = new this.orderModel({
        ...validatedData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const result = await newOrder.save();
      if (!result._id) {
        throw new InternalServerErrorException('Failed to create order');
      }

      // Si es una orden mayorista, guardar solo los datos personales en la colección mayoristas
      if (validatedData.orderType === 'mayorista') {
        try {
          // Preparar solo los datos personales para la colección mayoristas
          const mayoristaPersonData = {
            user: validatedData.user,
            address: validatedData.address,
          };

          // Crear o verificar si ya existe el mayorista
          const mayoristaResult = await this.mayoristasService.createMayoristaPerson(mayoristaPersonData);

          if (!mayoristaResult.success) {
            //deberiamos enviar esto al front
            console.warn('Warning: Order created but failed to save mayorista person data:', mayoristaResult.error);
          } else {
            if (mayoristaResult.isNew) {
              console.log('Order created and new mayorista person added to mayoristas collection');
            } else {
              console.log('Order created and existing mayorista person found in mayoristas collection');
            }
          }
        } catch (mayoristaError) {
          console.warn('Warning: Failed to save mayorista person data:', mayoristaError);
        }
      }

      return { success: true, order: result };
    } catch (error) {
      console.error('Error creating order:', error);
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException('Error creating order');
    }
  }

  async deleteOrder(id: string): Promise<{ success: boolean, error?: string }> {
    try {
      const order = await this.orderModel.findByIdAndDelete(id);
      if (!order) {
        throw new NotFoundException('Order not found');
      }
      return { success: true };
    } catch (error) {
      console.error('Error deleting order:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error deleting order');
    }
  }



  async updateOrder(id: string, data: UpdateOrderDto) {
    try {
      const updateData: any = { ...data };
      updateData.updatedAt = new Date();

      // Normalizar el formato de deliveryDay si está presente
      if (updateData.deliveryDay) {
        updateData.deliveryDay = normalizeDeliveryDay(updateData.deliveryDay);
      }

      // Normalizar el formato del schedule si está presente
      if (updateData.deliveryArea?.schedule) {
        updateData.deliveryArea.schedule = normalizeScheduleTime(updateData.deliveryArea.schedule);
      }

      // Procesar items para limpiar campos innecesarios y asegurar formato correcto
      if (updateData.items && Array.isArray(updateData.items)) {
        updateData.items = processOrderItems(updateData.items);
      }

      const result = await this.orderModel.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true }
      );

      if (!result) throw new NotFoundException('Order not found');

      return result;
    } catch (error) {
      console.error('Error updating order:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error updating order');
    }
  }

  private escapeRegex(string: string) {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  }


  async getAllOrders({
    search = '',
    sorting = [{ id: 'createdAt', desc: true }],
    from,
    to,
    orderType,
    limit,
  }: GetAllOrdersParams): Promise<Order[]> {
    try {
      const baseFilter: any = {};

      // Excluir pedidos express:
      // - Pedidos viejos: método de pago 'transfer' y 'bank-transfer'
      // - Pedidos nuevos: deliveryArea.sameDayDelivery: true
      baseFilter.$and = [
        {
          $or: [
            { paymentMethod: { $nin: ['transfer', 'bank-transfer'] } },
            { paymentMethod: { $exists: false } },
          ],
        },
        {
          $or: [
            { 'deliveryArea.sameDayDelivery': { $ne: true } },
            { 'deliveryArea.sameDayDelivery': { $exists: false } },
            { deliveryArea: { $exists: false } },
          ],
        },
      ];

      // Filtro por fecha si se proporciona
      if ((from && from.trim() !== '') || (to && to.trim() !== '')) {
        baseFilter.deliveryDay = {};
        if (from && from.trim() !== '') {
          const [year, month, day] = from.split('-').map(Number);
          const fromDateObj = new Date(year, month - 1, day, 0, 0, 0, 0);
          baseFilter.deliveryDay.$gte = fromDateObj;
        }
        if (to && to.trim() !== '') {
          const [year, month, day] = to.split('-').map(Number);
          const toDateObj = new Date(year, month - 1, day, 23, 59, 59, 999);
          baseFilter.deliveryDay.$lte = toDateObj;
        }
      }

      // Filtro por tipo de orden si se proporciona
      if (orderType && orderType.trim() !== '' && orderType !== 'all') {
        if (orderType === 'minorista') {
          baseFilter.$or = [
            { orderType: 'minorista' },
            { orderType: { $exists: false } },
            { orderType: null },
            { orderType: '' },
          ];
        } else {
          baseFilter.orderType = orderType;
        }
      }

      const searchFilter: any = {};
      if (search) {
        const searchWords = search.split(' ').filter(Boolean).map(s => this.escapeRegex(s));
        if (searchWords.length > 0) {
          searchFilter.$and = searchWords.map((word) => {
            // Mapeo de estados en español a inglés
            const statusMapping: Record<string, string[]> = {
              pendiente: ['pending'],
              confirmado: ['confirmed'],
              entregado: ['delivered'],
              cancelado: ['cancelled'],
              pending: ['pending'],
              confirmed: ['confirmed'],
              delivered: ['delivered'],
              cancelled: ['cancelled'],
            };

            // Mapeo de métodos de pago en español a inglés
            const paymentMethodMapping: Record<string, string[]> = {
              efectivo: ['cash'],
              transferencia: ['transfer', 'bank-transfer'],
              'mercado pago': ['mercado-pago'],
              cash: ['cash'],
              transfer: ['transfer'],
              'bank-transfer': ['bank-transfer'],
              'mercado-pago': ['mercado-pago'],
            };

            const statusFilters = [];
            const normalizedWord = word.toLowerCase();

            if (statusMapping[normalizedWord]) {
              statusMapping[normalizedWord].forEach((status) => {
                statusFilters.push({ status: { $regex: status, $options: 'i' } });
              });
            } else {
              statusFilters.push({ status: { $regex: word, $options: 'i' } });
            }

            const paymentMethodFilters = [];
            if (paymentMethodMapping[normalizedWord]) {
              paymentMethodMapping[normalizedWord].forEach((method) => {
                paymentMethodFilters.push({ paymentMethod: { $regex: method, $options: 'i' } });
              });
            } else {
              paymentMethodFilters.push({ paymentMethod: { $regex: word, $options: 'i' } });
            }

            return {
              $or: [
                { 'user.name': { $regex: word, $options: 'i' } },
                { 'user.lastName': { $regex: word, $options: 'i' } },
                { 'user.email': { $regex: word, $options: 'i' } },
                { 'items.name': { $regex: word, $options: 'i' } },
                { 'address.address': { $regex: word, $options: 'i' } },
                { 'address.city': { $regex: word, $options: 'i' } },
                ...paymentMethodFilters,
                ...statusFilters,
                { notesOwn: { $regex: word, $options: 'i' } },
                { orderType: { $regex: word, $options: 'i' } },
              ],
            };
          });
        }

        const isObjectId = /^[0-9a-fA-F]{24}$/.test(search.trim());
        if (isObjectId) {
          const objectIdMatch = { _id: new Types.ObjectId(search.trim()) };
          if (searchFilter.$and) {
            searchFilter.$or = [...searchFilter.$and, objectIdMatch];
            delete searchFilter.$and;
          } else {
            searchFilter._id = new Types.ObjectId(search.trim());
          }
        }
      }

      const finalAnd = [baseFilter];
      if (Object.keys(searchFilter).length > 0) {
        finalAnd.push(searchFilter);
      }
      const matchQuery = { $and: finalAnd };

      const sortQuery: any = {};
      sorting.forEach((sort) => {
        sortQuery[sort.id] = sort.desc ? -1 : 1;
      });

      let query = this.orderModel.find(matchQuery).sort(sortQuery);

      if (limit && limit > 0) {
        query = query.limit(limit);
      }

      const orders = await query.exec();
      return orders;
    } catch (error) {
      throw new InternalServerErrorException('Could not fetch orders for export.');
    }
  }

  async getBalanceMonthly(startDate?: Date, endDate?: Date) {
    try {
      const ordersMatchCondition: any = {};
      if (startDate || endDate) {
        ordersMatchCondition.createdAt = {};
        if (startDate) ordersMatchCondition.createdAt.$gte = startDate;
        if (endDate) ordersMatchCondition.createdAt.$lte = endDate;
      } else {
        const currentYear = new Date().getFullYear();
        const yearStartDate = new Date(currentYear - 2, 0, 1);
        const yearEndDate = new Date(currentYear, 11, 31, 23, 59, 59);
        ordersMatchCondition.createdAt = { $gte: yearStartDate, $lte: yearEndDate };
      }

      const ordersPipeline: any[] = [];
      ordersPipeline.push({
        $addFields: {
          createdAt: {
            $cond: [
              { $eq: [{ $type: "$createdAt" }, "string"] },
              { $toDate: "$createdAt" },
              "$createdAt"
            ]
          }
        }
      });

      if (Object.keys(ordersMatchCondition).length > 0) {
        ordersPipeline.push({ $match: ordersMatchCondition });
      }

      ordersPipeline.push(
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            totalExpress: {
              $sum: {
                $cond: [
                  { $eq: [{ $ifNull: ['$paymentMethod', ''] }, 'bank-transfer'] },
                  '$total',
                  0
                ]
              }
            },
            cantExpress: {
              $sum: {
                $cond: [
                  { $eq: [{ $ifNull: ['$paymentMethod', ''] }, 'bank-transfer'] },
                  1,
                  0
                ]
              }
            },
            totalMayorista: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: [{ $ifNull: ['$orderType', 'minorista'] }, 'mayorista'] },
                      { $ne: [{ $ifNull: ['$paymentMethod', ''] }, 'bank-transfer'] }
                    ]
                  },
                  '$total',
                  0
                ]
              }
            },
            cantMayorista: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: [{ $ifNull: ['$orderType', 'minorista'] }, 'mayorista'] },
                      { $ne: [{ $ifNull: ['$paymentMethod', ''] }, 'bank-transfer'] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            totalMinorista: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: [{ $ifNull: ['$orderType', 'minorista'] }, 'mayorista'] },
                      { $ne: [{ $ifNull: ['$paymentMethod', ''] }, 'bank-transfer'] }
                    ]
                  },
                  '$total',
                  0
                ]
              }
            },
            cantMinorista: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: [{ $ifNull: ['$orderType', 'minorista'] }, 'mayorista'] },
                      { $ne: [{ $ifNull: ['$paymentMethod', ''] }, 'bank-transfer'] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            totalEntradas: { $sum: '$total' },
            totalOrdenes: { $sum: 1 },
            totalItems: { $sum: { $size: { $ifNull: ['$items', []] } } }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      );

      const ordersResult = await this.orderModel.aggregate(ordersPipeline).exec();

      const salidasMatchCondition: any = {};
      if (startDate || endDate) {
        salidasMatchCondition.fechaFactura = {};
        if (startDate) salidasMatchCondition.fechaFactura.$gte = startDate;
        if (endDate) salidasMatchCondition.fechaFactura.$lte = endDate;
      } else {
        const currentYear = new Date().getFullYear();
        const yearStartDate = new Date(currentYear - 2, 0, 1);
        const yearEndDate = new Date(currentYear, 11, 31, 23, 59, 59);
        salidasMatchCondition.fechaFactura = { $gte: yearStartDate, $lte: yearEndDate };
      }

      const salidasResult = await this.salidasModel.find(salidasMatchCondition).exec();

      const salidasByMonth = new Map<string, any>();
      for (const salida of salidasResult) {
        const fecha = new Date(salida.fechaFactura);
        const monthKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
        const marca = salida.marca?.toLowerCase() || 'barfer';
        const isBarfer = marca === 'barfer';
        const isSLR = marca === 'slr';

        const current = salidasByMonth.get(monthKey) || {
          total: 0,
          ordinariosBarfer: 0,
          ordinariosSLR: 0,
          extraordinariosBarfer: 0,
          extraordinariosSLR: 0
        };

        current.total += salida.monto;
        if (salida.tipo === 'ORDINARIO') {
          if (isSLR) current.ordinariosSLR += salida.monto;
          else current.ordinariosBarfer += salida.monto;
        } else if (salida.tipo === 'EXTRAORDINARIO') {
          if (isSLR) current.extraordinariosSLR += salida.monto;
          else current.extraordinariosBarfer += salida.monto;
        }
        salidasByMonth.set(monthKey, current);
      }

      const balanceData = [];
      for (const orderData of ordersResult) {
        const monthKey = `${orderData._id.year}-${String(orderData._id.month).padStart(2, '0')}`;
        const salidasData = salidasByMonth.get(monthKey) || {
          total: 0,
          ordinariosBarfer: 0,
          ordinariosSLR: 0,
          extraordinariosBarfer: 0,
          extraordinariosSLR: 0
        };

        const totalEntradas = orderData.totalEntradas;
        const totalMinorista = orderData.totalMinorista;
        const totalMayorista = orderData.totalMayorista;
        const totalExpress = orderData.totalExpress;
        const totalOrdenes = orderData.totalOrdenes;
        const estimatedWeight = orderData.totalItems * 8; // Estimación de 8kg promedio por item

        const resultadoSinExtraordinarios = totalEntradas - (salidasData.ordinariosBarfer + salidasData.ordinariosSLR);
        const resultadoConExtraordinarios = totalEntradas - salidasData.total;
        const precioPorKg = estimatedWeight > 0 ? totalEntradas / estimatedWeight : 0;

        balanceData.push({
          mes: monthKey,
          entradasMinorista: totalMinorista,
          entradasMinoristaPorcentaje: totalEntradas > 0 ? (totalMinorista / totalEntradas) * 100 : 0,
          cantVentasMinorista: orderData.cantMinorista,
          cantVentasMinoristaPorcentaje: totalOrdenes > 0 ? (orderData.cantMinorista / totalOrdenes) * 100 : 0,
          entradasMayorista: totalMayorista,
          entradasMayoristaPorcentaje: totalEntradas > 0 ? (totalMayorista / totalEntradas) * 100 : 0,
          cantVentasMayorista: orderData.cantMayorista,
          cantVentasMayoristaPorcentaje: totalOrdenes > 0 ? (orderData.cantMayorista / totalOrdenes) * 100 : 0,
          entradasExpress: totalExpress,
          entradasExpressPorcentaje: totalEntradas > 0 ? (totalExpress / totalEntradas) * 100 : 0,
          cantVentasExpress: orderData.cantExpress,
          cantVentasExpressPorcentaje: totalOrdenes > 0 ? (orderData.cantExpress / totalOrdenes) * 100 : 0,
          entradasTotales: totalEntradas,
          salidas: salidasData.total,
          salidasPorcentaje: totalEntradas > 0 ? (salidasData.total / totalEntradas) * 100 : 0,
          gastosOrdinariosBarfer: salidasData.ordinariosBarfer,
          gastosOrdinariosSLR: salidasData.ordinariosSLR,
          gastosOrdinariosTotal: salidasData.ordinariosBarfer + salidasData.ordinariosSLR,
          gastosExtraordinariosBarfer: salidasData.extraordinariosBarfer,
          gastosExtraordinariosSLR: salidasData.extraordinariosSLR,
          gastosExtraordinariosTotal: salidasData.extraordinariosBarfer + salidasData.extraordinariosSLR,
          resultadoSinExtraordinarios,
          resultadoConExtraordinarios,
          porcentajeSinExtraordinarios: totalEntradas > 0 ? (resultadoSinExtraordinarios / totalEntradas) * 100 : 0,
          porcentajeConExtraordinarios: totalEntradas > 0 ? (resultadoConExtraordinarios / totalEntradas) * 100 : 0,
          precioPorKg
        });
      }

      return { success: true, data: balanceData };
    } catch (error) {
      console.error('Error fetching balance monthly:', error);
      throw new InternalServerErrorException('Could not fetch balance monthly.');
    }
  }

  getWeightFromOption(productName: string, optionName: string): number {
    const lowerProductName = productName.toLowerCase();
    if (lowerProductName.includes('big dog')) return 15;
    if (lowerProductName.includes('complemento')) return 0;
    const match = optionName.match(/(\d+(?:\.\d+)?)\s*k?g/i);
    if (match && match[1]) return parseFloat(match[1]);
    return 0;
  }





}




