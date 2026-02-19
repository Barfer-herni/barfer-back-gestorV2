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
import { CouponsService } from '../coupons/coupons.service';
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

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Mayoristas.name) private readonly mayoristasModel: Model<Mayoristas>,
    @InjectModel(PuntoEnvio.name) private readonly puntoEnvioModel: Model<PuntoEnvio>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly usersService: UsersService,
    private readonly productsService: ProductsService,
    private readonly addressService: AddressService,
    private readonly deliveryAreaService: DeliveryAreasService,
    private readonly configService: ConfigService,
    private readonly optionsService: OptionsService,
    private readonly couponService: CouponsService,
    private readonly mayoristasService: MayoristasService,
  ) { }


  async createOrder(data: OrderDto) {
    try {
      const validatedData = data;

      // Normalizar el formato de deliveryDay si está presente
      if (validatedData.deliveryDay) {
        validatedData.deliveryDay = normalizeDeliveryDay(validatedData.deliveryDay);

        // Ajustar fecha según horario de corte (solo para envíos express con punto definido)
        if (validatedData.puntoEnvio) {
          validatedData.deliveryDay = await this.adjustDeliveryDateByCutoff(validatedData.deliveryDay, validatedData.puntoEnvio);
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





  //pasaje a punto de envio
  private async adjustDeliveryDateByCutoff(deliveryDate: Date, puntoEnvioName?: string): Promise<Date> {
    if (!puntoEnvioName) return deliveryDate;
    try {
      const puntoEnvio = await this.puntoEnvioModel.findOne({ nombre: puntoEnvioName }).exec();

      if (!puntoEnvio || !puntoEnvio.cutoffTime) return deliveryDate;

      const cutoffTime = puntoEnvio.cutoffTime; // Format: "HH:mm"
      const [cutoffHour, cutoffMinute] = cutoffTime.split(':').map(Number);

      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Argentina/Buenos_Aires',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
      });

      const parts = formatter.formatToParts(now);
      const hourPart = parts.find(p => p.type === 'hour')?.value;
      const minutePart = parts.find(p => p.type === 'minute')?.value;

      if (!hourPart || !minutePart) return deliveryDate;

      const currentHour = parseInt(hourPart);
      const currentMinute = parseInt(minutePart);

      const isAfterCutoff = currentHour > cutoffHour || (currentHour === cutoffHour && currentMinute >= cutoffMinute);

      if (isAfterCutoff) {
        const todayArg = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
        todayArg.setHours(0, 0, 0, 0);

        const deliveryDateZero = new Date(deliveryDate);
        deliveryDateZero.setHours(0, 0, 0, 0);

        if (deliveryDateZero.getTime() <= todayArg.getTime()) {
          const nextDay = new Date(deliveryDateZero);
          nextDay.setDate(nextDay.getDate() + 1);

          if (nextDay.getDay() === 0) {
            nextDay.setDate(nextDay.getDate() + 1);
          }
          return nextDay;
        }
      }
      return deliveryDate;
    } catch (error) {
      console.error('Error adjusting delivery date by cutoff:', error);
      return deliveryDate;
    }
  }
}
