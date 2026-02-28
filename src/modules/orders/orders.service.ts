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
    pageIndex,
    pageSize,
  }: GetAllOrdersParams): Promise<{ orders: Order[]; total: number; pageCount: number }> {
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

      const total = await this.orderModel.countDocuments(matchQuery);

      let query = this.orderModel.find(matchQuery).sort(sortQuery);

      if (pageSize && pageSize > 0) {
        const skip = (pageIndex || 0) * pageSize;
        query = query.skip(skip).limit(pageSize);
      } else if (limit && limit > 0) {
        query = query.limit(limit);
      }

      const orders = await query.exec();
      const effectivePageSize = pageSize || total || 1;
      const pageCount = Math.ceil(total / effectivePageSize);

      return { orders, total, pageCount };
    } catch (error) {
      throw new InternalServerErrorException('Could not fetch orders for export.');
    }
  }
}
