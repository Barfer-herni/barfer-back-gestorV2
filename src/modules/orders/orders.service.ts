import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order } from '../../schemas/order.schema';
import { OrderBackup } from '../../schemas/order-backup.schema';
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
import { normalizeDeliveryDay, normalizeScheduleTime, processOrderItems, validateAndNormalizePhone } from './orders.helpers';
import { MayoristasService } from '../mayoristas/mayoristas.service';
import { PuntoEnvioService } from '../punto-envio/punto-envio.service';
import { PricesService } from '../prices/prices.service';
import { Types } from 'mongoose';
import { GetAllOrdersParams } from './interfaces/gett-all-orders-params';
import { OrderPriority } from '../../schemas/order_priority-schema';


@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(OrderBackup.name) private readonly orderBackupModel: Model<OrderBackup>,
    @InjectModel(Mayoristas.name) private readonly mayoristasModel: Model<Mayoristas>,
    @InjectModel(Salidas.name) private readonly salidasModel: Model<Salidas>,
    @InjectModel(OrderPriority.name) private readonly orderPriorityModel: Model<OrderPriority>,
    private readonly usersService: UsersService,
    private readonly productsService: ProductsService,
    private readonly addressService: AddressService,
    private readonly deliveryAreaService: DeliveryAreasService,
    private readonly configService: ConfigService,
    private readonly optionsService: OptionsService,
    private readonly mayoristasService: MayoristasService,
    private readonly puntoEnvioService: PuntoEnvioService,
    private readonly pricesService: PricesService,
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
            console.warn('Warning: Order created but failed to save mayorista person data:', mayoristaResult.error);
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
      // Crear backup antes de eliminar
      const existingOrder = await this.orderModel.findById(id);
      if (!existingOrder) {
        throw new NotFoundException('Order not found');
      }

      await this.orderBackupModel.create({
        originalOrderId: new Types.ObjectId(id),
        orderData: existingOrder.toObject(),
        action: 'delete',
      });

      await this.orderModel.findByIdAndDelete(id);
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
      // Crear backup antes de actualizar
      const existingOrder = await this.orderModel.findById(id);
      if (!existingOrder) {
        throw new NotFoundException('Order not found');
      }

      await this.orderBackupModel.create({
        originalOrderId: new Types.ObjectId(id),
        orderData: existingOrder.toObject(),
        action: 'update',
      });

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

      return { success: true, order: result };
    } catch (error) {
      console.error('Error updating order:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error updating order');
    }
  }

  // ===== DUPLICATE ORDER =====

  async duplicateOrder(id: string) {
    try {
      const originalOrder = await this.orderModel.findById(id);
      if (!originalOrder) {
        throw new NotFoundException('Order not found');
      }

      const orderData = originalOrder.toObject();
      delete orderData._id;
      delete (orderData as any).__v;

      const duplicatedOrder = new this.orderModel({
        ...orderData,
        notesOwn: orderData.notesOwn ? `DUPLICADO - ${orderData.notesOwn}` : 'DUPLICADO',
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await duplicatedOrder.save();

      return {
        success: true,
        order: result,
        message: 'Pedido duplicado correctamente',
      };
    } catch (error) {
      console.error('Error duplicating order:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error duplicating order');
    }
  }

  // ===== BULK STATUS UPDATE =====

  async updateOrdersStatusBulk(ids: string[], status: string) {
    try {
      const objectIds = ids.map(id => new Types.ObjectId(id));

      // Crear backups de todas las órdenes antes de actualizar
      const existingOrders = await this.orderModel.find({ _id: { $in: objectIds } });
      const backups = existingOrders.map(order => ({
        originalOrderId: order._id,
        orderData: order.toObject(),
        action: 'update',
      }));
      if (backups.length > 0) {
        await this.orderBackupModel.insertMany(backups);
      }

      const result = await this.orderModel.updateMany(
        { _id: { $in: objectIds } },
        { $set: { status, updatedAt: new Date() } }
      );

      return {
        success: true,
        modifiedCount: result.modifiedCount,
      };
    } catch (error) {
      console.error('Error updating orders status:', error);
      throw new InternalServerErrorException('Error updating orders status');
    }
  }

  // ===== BACKUP / UNDO SYSTEM =====

  async getBackupsCount(): Promise<{ success: boolean; count: number }> {
    try {
      const count = await this.orderBackupModel.countDocuments();
      return { success: true, count };
    } catch (error) {
      console.error('Error getting backups count:', error);
      return { success: false, count: 0 };
    }
  }

  async undoLastChange(): Promise<{ success: boolean; error?: string }> {
    try {
      const lastBackup = await this.orderBackupModel.findOne().sort({ createdAt: -1 });
      if (!lastBackup) {
        return { success: false, error: 'No hay cambios para deshacer' };
      }

      if (lastBackup.action === 'delete') {
        // Restaurar la orden eliminada
        const orderData = { ...lastBackup.orderData };
        const originalId = lastBackup.originalOrderId;
        delete (orderData as any).__v;

        // Intentar restaurar con el mismo _id
        await this.orderModel.create({ ...orderData, _id: originalId });
      } else if (lastBackup.action === 'update') {
        // Restaurar al estado anterior
        const orderData = { ...lastBackup.orderData };
        const originalId = lastBackup.originalOrderId;
        delete (orderData as any)._id;
        delete (orderData as any).__v;

        await this.orderModel.findByIdAndUpdate(
          originalId,
          { $set: orderData },
          { new: true }
        );
      }

      // Eliminar el backup usado
      await this.orderBackupModel.findByIdAndDelete(lastBackup._id);

      return { success: true };
    } catch (error) {
      console.error('Error undoing last change:', error);
      return { success: false, error: 'Error al deshacer el cambio' };
    }
  }

  async clearAllBackups(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.orderBackupModel.deleteMany({});
      return { success: true };
    } catch (error) {
      console.error('Error clearing backups:', error);
      return { success: false, error: 'Error al limpiar el historial' };
    }
  }

  // ===== PRICE CALCULATION =====

  async calculatePrice(
    items: Array<{
      name: string;
      fullName?: string;
      options: Array<{ name: string; quantity: number }>;
    }>,
    orderType: 'minorista' | 'mayorista',
    paymentMethod: string,
    deliveryDate?: string | Date,
  ): Promise<{
    success: boolean;
    total?: number;
    itemPrices?: Array<{
      name: string;
      weight: string;
      unitPrice: number;
      quantity: number;
      subtotal: number;
    }>;
    error?: string;
  }> {
    try {
      let priceType: string;
      if (orderType === 'mayorista') {
        priceType = 'MAYORISTA';
      } else if (paymentMethod === 'efectivo' || paymentMethod === 'cash') {
        priceType = 'EFECTIVO';
      } else if (
        paymentMethod === 'transferencia' ||
        paymentMethod === 'transfer' ||
        paymentMethod === 'bank-transfer' ||
        paymentMethod === 'mercado-pago' ||
        paymentMethod === 'mercado-pago'
      ) {
        priceType = 'TRANSFERENCIA';
      } else {
        priceType = 'TRANSFERENCIA';
      }

      const pricesResult = await this.pricesService.getAllPrices();
      if (!pricesResult.success || !pricesResult.prices) {
        return { success: false, error: 'No se pudieron obtener los precios' };
      }
      const allPrices = [...pricesResult.prices].sort((a: any, b: any) => {
        const dateA = a.validFrom ? new Date(a.validFrom).getTime() : (a.effectiveDate ? new Date(a.effectiveDate).getTime() : 0);
        const dateB = b.validFrom ? new Date(b.validFrom).getTime() : (b.effectiveDate ? new Date(b.effectiveDate).getTime() : 0);

        if (dateB !== dateA) {
          return dateB - dateA;
        }

        const createA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const createB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return createB - createA;
      });

      const itemPrices: Array<{
        name: string;
        weight: string;
        unitPrice: number;
        quantity: number;
        subtotal: number;
      }> = [];
      let total = 0;

      for (const item of items) {
        let section: string | null = null;
        let product: string | null = null;
        let weight: string | null = null;

        const nameToCheck = item.fullName || item.name;

        if (nameToCheck && nameToCheck.includes(' - ')) {
          const parts = nameToCheck.split(' - ');
          section = parts[0]?.trim().toUpperCase() || null;
          product = parts[1]?.trim().toUpperCase() || null;
          weight = parts[2]?.trim().toUpperCase() || null;
        } else if (nameToCheck && nameToCheck.toUpperCase().startsWith('BOX ')) {
          const boxParts = nameToCheck.split(' ');
          const potentialSection = boxParts[1]?.toUpperCase();
          const knownSections = ['PERRO', 'GATO', 'RAW', 'OTROS'];

          if (knownSections.includes(potentialSection)) {
            section = potentialSection;
            product = boxParts.slice(2).join(' ').trim().toUpperCase();
          } else {
            product = nameToCheck.substring(4).trim().toUpperCase();
          }
          weight = item.options?.[0]?.name?.toUpperCase() || null;
        } else {
          product = item.name?.toUpperCase() || null;
          weight = item.options?.[0]?.name?.toUpperCase() || null;
        }

        const matchesProduct = (p: any) => {
          const pSection = (p.section || '').toUpperCase();
          const pProduct = (p.product || '').toUpperCase();
          const pWeight = (p.weight || '').toUpperCase();
          const pPriceType = (p.priceType || '').toUpperCase();

          if (pPriceType !== priceType) return false;

          if (section) {
            return pSection === section && pProduct === product && (
              (!weight && !pWeight) || pWeight === weight
            );
          }

          return pProduct === product && (
            (!weight && !pWeight) || pWeight === weight
          );
        };

        const matchingPrice = allPrices.find((p: any) => matchesProduct(p) && p.price > 0);
        const fallbackPrice = !matchingPrice ? allPrices.find((p: any) => matchesProduct(p)) : null;
        const unitPrice = matchingPrice ? matchingPrice.price : (fallbackPrice ? fallbackPrice.price : 0);

        const quantity = item.options?.reduce((sum, opt) => sum + (opt.quantity || 1), 0) || 1;

        const subtotal = unitPrice * quantity;
        total += subtotal;

        itemPrices.push({
          name: item.fullName || item.name,
          weight: weight || item.options?.[0]?.name || '',
          unitPrice,
          quantity,
          subtotal,
        });
      }
      return {
        success: true,
        total,
        itemPrices,
      };
    } catch (error) {
      console.error('Error calculating price:', error);
      return { success: false, error: 'Error al calcular el precio' };
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
    page = 0,
    pageSize = 50,
  }: GetAllOrdersParams): Promise<{ orders: Order[]; total: number }> {
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

      // Build Sort Query safely
      const sortQuery: any = {};
      if (Array.isArray(sorting)) {
        sorting.forEach((sort) => {
          if (sort && sort.id) {
            sortQuery[sort.id] = sort.desc ? -1 : 1;
          }
        });
      }

      // If no valid sorting, default to createdAt desc
      if (Object.keys(sortQuery).length === 0) {
        sortQuery.createdAt = -1;
      }

      // Count total matches for pagination
      const total = await this.orderModel.countDocuments(matchQuery);

      let query = this.orderModel.find(matchQuery).sort(sortQuery).allowDiskUse(true);

      // Apply pagination
      if (page !== undefined && pageSize !== undefined) {
        query = query.skip(page * pageSize).limit(pageSize);
      } else if (limit && limit > 0) {
        query = query.limit(limit);
      }

      const orders = await query.exec();
      return { orders, total };
    } catch (error) {
      console.error('Error in getAllOrders:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        params: { search, from, to, orderType, limit, page, pageSize }
      });
      throw new InternalServerErrorException(
        error instanceof Error ? `Could not fetch orders: ${error.message}` : 'Could not fetch orders for export.'
      );
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



  async getExpressOrders(
    puntoEnvio?: string,
    from?: string,
    to?: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ orders: Order[]; total: number; page: number; totalPages: number }> {
    try {
      const filter: any = {
        $or: [
          { paymentMethod: 'bank-transfer' },
          { 'deliveryArea.sameDayDelivery': true },
          { puntoEnvio: { $exists: true, $nin: [null, ''] } }
        ]
      };

      if (puntoEnvio) filter.puntoEnvio = puntoEnvio;

      // Si no se pasa rango de fechas, filtrar por defecto los últimos 7 días
      if (!from && !to) {
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        filter.$and = [
          {
            $or: [
              { deliveryDay: { $gte: sevenDaysAgo } },
              {
                $and: [
                  { deliveryDay: { $exists: false } },
                  { createdAt: { $gte: sevenDaysAgo } },
                ],
              },
              {
                $and: [
                  { deliveryDay: null },
                  { createdAt: { $gte: sevenDaysAgo } },
                ],
              },
            ],
          },
        ];
      }

      if ((from && from.trim() !== '') || (to && to.trim() !== '')) {
        const fromVal = from?.trim() || '';
        const toVal = to?.trim() || fromVal;

        let fromDateUTC: Date | undefined;
        let toDateUTC: Date | undefined;

        if (fromVal) {
          const [year, month, day] = fromVal.split('-').map(Number);
          fromDateUTC = new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0));
        }
        if (toVal) {
          const [year, month, day] = toVal.split('-').map(Number);
          toDateUTC = new Date(Date.UTC(year, month - 1, day + 1, 2, 59, 59, 999));
        }

        let fromDeliveryUTC: Date | undefined;
        let toDeliveryUTC: Date | undefined;
        if (fromVal) {
          const [year, month, day] = fromVal.split('-').map(Number);
          fromDeliveryUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        }
        if (toVal) {
          const [year, month, day] = toVal.split('-').map(Number);
          toDeliveryUTC = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
        }

        filter.$and = [
          {
            $or: [
              {
                deliveryDay: {
                  ...(fromDeliveryUTC && { $gte: fromDeliveryUTC }),
                  ...(toDeliveryUTC && { $lte: toDeliveryUTC })
                }
              },
              {
                $and: [
                  { deliveryDay: { $exists: false } },
                  {
                    createdAt: {
                      ...(fromDateUTC && { $gte: fromDateUTC }),
                      ...(toDateUTC && { $lte: toDateUTC })
                    }
                  }
                ]
              },
              {
                $and: [
                  { deliveryDay: null },
                  {
                    createdAt: {
                      ...(fromDateUTC && { $gte: fromDateUTC }),
                      ...(toDateUTC && { $lte: toDateUTC })
                    }
                  }
                ]
              }
            ]
          }
        ];
      }

      const skip = (page - 1) * limit;

      // Proyectar solo los campos necesarios para la tabla (evita traer documentos completos pesados)
      const tableProjection = {
        _id: 1,
        status: 1,
        estadoEnvio: 1,
        puntoEnvio: 1,
        deliveryDay: 1,
        createdAt: 1,
        updatedAt: 1,
        total: 1,
        paymentMethod: 1,
        notesOwn: 1,
        orderType: 1,
        'user.name': 1,
        'user.lastName': 1,
        'user.email': 1,
        'user.phone': 1,
        'address.address': 1,
        'address.city': 1,
        'address.phone': 1,
        'address.betweenStreets': 1,
        'address.floorNumber': 1,
        'address.departmentNumber': 1,
        'address.reference': 1,
        'items.name': 1,
        'items.fullName': 1,
        'items.options': 1,
        'deliveryArea.sameDayDelivery': 1,
        'deliveryArea.schedule': 1,
      };

      const [orders, total] = await Promise.all([
        this.orderModel
          .find(filter)
          .select(tableProjection)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.orderModel.countDocuments(filter)
      ]);

      return {
        orders,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Error al obtener órdenes express:', error);
      return { orders: [], total: 0, page, totalPages: 0 };
    }
  }

  async getOrderPriority(fecha: string, puntoEnvio: string) {
    try {
      const orders = await this.orderPriorityModel.findOne({
        fecha,
        puntoEnvio
      })

      return { success: true, data: orders };
    } catch (error) {
      console.error('Error fetching order priority:', error);
      throw new InternalServerErrorException('Could not fetch order priority.');
    }
  }



  async duplicateExpressOrderAction(orderId: string, targetPuntoEnvio: string, user: any) {
    try {
      const originalOrder = await this.orderModel.findById(orderId);
      if (!originalOrder) {
        return { success: false, error: 'Orden no encontrada' };
      }

      const duplicatedOrderData = originalOrder.toObject();
      delete (duplicatedOrderData as any)._id;
      delete (duplicatedOrderData as any).__v;

      if (duplicatedOrderData.address?.phone) {
        const normalizedPhone = validateAndNormalizePhone(String(duplicatedOrderData.address.phone));
        if (!normalizedPhone) {
          return {
            success: false,
            error: 'El número de teléfono no es válido. Use el formato: La Plata (221 XXX-XXXX) o CABA/BA (11-XXXX-XXXX / 15-XXXX-XXXX)',
          };
        }
        (duplicatedOrderData.address as any).phone = normalizedPhone;
      }

      let recalculatedTotal = duplicatedOrderData.total;
      try {
        const result = await this.calculatePrice(
          (duplicatedOrderData.items || []) as any,
          (duplicatedOrderData.orderType as 'minorista' | 'mayorista') || 'minorista',
          duplicatedOrderData.paymentMethod || '',
          duplicatedOrderData.deliveryDay as any
        );
        if (result.success && result.total !== undefined) {
          recalculatedTotal = result.total;
        }
      } catch (error) {
        console.error('Error recalculando precio al duplicar:', error);
      }

      const modifiedOrderData = {
        ...duplicatedOrderData,
        status: 'pending',
        estadoEnvio: 'pendiente',
        puntoEnvio: targetPuntoEnvio,
        notesOwn: `DUPLICADO - ${duplicatedOrderData.notesOwn || ''}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        total: recalculatedTotal,
      };

      if (modifiedOrderData.deliveryArea) {
        modifiedOrderData.deliveryArea.sheetName = modifiedOrderData.deliveryArea.sheetName || '';
        modifiedOrderData.deliveryArea.whatsappNumber = modifiedOrderData.deliveryArea.whatsappNumber || '';
      }

      if (modifiedOrderData.address) {
        modifiedOrderData.address.betweenStreets = modifiedOrderData.address.betweenStreets || '';
        modifiedOrderData.address.floorNumber = modifiedOrderData.address.floorNumber || '';
        modifiedOrderData.address.departmentNumber = modifiedOrderData.address.departmentNumber || '';
        modifiedOrderData.address.reference = modifiedOrderData.address.reference || '';
      }

      const newOrder = new this.orderModel(modifiedOrderData);
      const savedOrder = await newOrder.save();

      return {
        success: true,
        order: savedOrder,
        message: `Pedido duplicado correctamente en ${targetPuntoEnvio}`,
      };

    } catch (error) {
      console.error('Error in duplicateExpressOrderAction:', error);
      return { success: false, error: 'Error al duplicar la orden' };
    }
  }


  async saveOrderPriorityAction(fecha: string, puntoEnvio: string, orderIds: string[]) {
    try {
      const result = await this.orderPriorityModel.findOneAndUpdate(
        { fecha, puntoEnvio },
        { $set: { orderIds, updatedAt: new Date() } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      return { success: true, data: result };
    } catch (error) {
      console.error('Error saving order priority:', error);
      throw new InternalServerErrorException('Could not save order priority.');
    }
  }

  async updateEstadoEnvioAction(orderId: string, estadoEnvio: string) {
    try {
      const result = await this.orderModel.findByIdAndUpdate(
        orderId,
        { $set: { estadoEnvio, updatedAt: new Date() } },
        { new: true }
      );
      return { success: true, order: result };
    } catch (error) {
      console.error('Error updating estado envio:', error);
      throw new InternalServerErrorException('Could not update estado envio.');
    }
  }

  async countOrdersByDay(puntoEnvio: string, date: string | Date): Promise<number> {
    try {
      const targetDate = typeof date === 'string' ? new Date(date) : date;
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const count = await this.orderModel.countDocuments({
        puntoEnvio,
        $or: [
          {
            deliveryDay: {
              $gte: startOfDay,
              $lte: endOfDay,
            },
          },
          {
            $and: [
              { deliveryDay: { $exists: false } },
              {
                createdAt: {
                  $gte: startOfDay,
                  $lte: endOfDay,
                },
              },
            ],
          },
          {
            $and: [
              { deliveryDay: null },
              {
                createdAt: {
                  $gte: startOfDay,
                  $lte: endOfDay,
                },
              },
            ],
          },
        ],
      });

      return count;
    } catch (error) {
      console.error('Error counting orders by day:', error);
      return 0;
    }
  }

}




