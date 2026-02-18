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
import { UpdateStatusDto } from './dto/update-status.dto';
import { DiscountCalculatorService } from './services/discount-calculator.service';

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
    private readonly discountCalculatorService: DiscountCalculatorService,
  ) { }


  async createOrder(data: OrderDto) {
    try {
      const validatedData = data;

      // Normalizar el formato de deliveryDay si está presente
      if (validatedData.deliveryDay) {
        validatedData.deliveryDay = this.normalizeDeliveryDay(validatedData.deliveryDay);

        // Ajustar fecha según horario de corte (solo para envíos express con punto definido)
        if (validatedData.puntoEnvio) {
          validatedData.deliveryDay = await this.adjustDeliveryDateByCutoff(validatedData.deliveryDay, validatedData.puntoEnvio);
        }
      }

      // Normalizar el formato del schedule si está presente
      if (validatedData.deliveryArea?.schedule) {
        validatedData.deliveryArea.schedule = this.normalizeScheduleTime(validatedData.deliveryArea.schedule);
      }

      // Procesar items para limpiar campos innecesarios y asegurar formato correcto
      if (validatedData.items && Array.isArray(validatedData.items)) {
        validatedData.items = this.processOrderItems(validatedData.items);
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
          const mayoristaResult = await this.createMayoristaPerson(mayoristaPersonData);

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




  // --- Helper Methods ---

  private normalizeScheduleTime(schedule: string): string {
    if (!schedule) return schedule;

    // Evitar normalizar si ya está en formato correcto
    if (schedule.includes(':') && !schedule.includes('.')) {
      return schedule;
    }

    let normalized = schedule;

    // Primero: buscar patrones con espacios como "18 . 30", "19 . 45" y convertirlos
    normalized = normalized.replace(/(\d{1,2})\s*\.\s*(\d{1,2})/g, (match, hour, minute) => {
      const paddedMinute = minute.padStart(2, '0');
      return `${hour}:${paddedMinute}`;
    });

    // Segundo: buscar patrones de hora como "18.30", "19.45", "10.15", etc.
    normalized = normalized.replace(/(\d{1,2})\.(\d{1,2})/g, (match, hour, minute) => {
      const paddedMinute = minute.padStart(2, '0');
      return `${hour}:${paddedMinute}`;
    });

    // Tercero: buscar patrones de solo hora como "18hs", "19hs" y convertirlos a "18:00hs", "19:00hs"
    normalized = normalized.replace(/(\d{1,2})(?<!:\d{2})hs/g, '$1:00hs');

    // Cuarto: buscar patrones de 4 dígitos consecutivos (como "1830", "2000") y convertirlos a formato de hora
    normalized = normalized.replace(/(\d{1,2})(\d{2})(?=\s|hs|$|a|aprox)/g, (match, hour, minute) => {
      const minuteNum = parseInt(minute);
      if (minuteNum >= 0 && minuteNum <= 59) {
        return `${hour}:${minute}`;
      }
      return match;
    });

    return normalized;
  }

  private normalizeDeliveryDay(dateInput: any): Date {
    if (!dateInput) return new Date();
    let date: Date;

    if (typeof dateInput === 'object' && '$date' in dateInput) {
      date = new Date(dateInput.$date);
    } else if (dateInput instanceof Date) {
      date = dateInput;
    } else {
      date = new Date(dateInput);
    }
    if (isNaN(date.getTime())) throw new BadRequestException('Invalid date');
    const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return localDate;
  }

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

  private processOrderItems(items: any[]): any[] {
    return items.map(item => ({
      ...item,
      // Usar _id si existe, o asegurar id como string
      id: item._id ? item._id.toString() : (item.id ? item.id.toString() : ''),
    }));
  }

  private async createMayoristaPerson(data: any): Promise<{ success: boolean; isNew?: boolean; error?: string }> {
    try {
      const { user, address } = data;
      const existingMayorista = await this.mayoristasModel.findOne({ 'user.email': user.email }).exec();
      if (existingMayorista) return { success: true, isNew: false };

      const newMayorista = new this.mayoristasModel({
        user,
        address,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await newMayorista.save();
      return { success: true, isNew: true };
    } catch (error) {
      console.error('Error in createMayoristaPerson:', error);
      return { success: false, error: error.message };
    }
  }
}
