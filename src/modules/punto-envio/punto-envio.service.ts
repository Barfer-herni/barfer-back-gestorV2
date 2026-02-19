import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ConflictException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
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
import { PuntoEnvioDto } from './dto/punto-envio.dto';
import { UpdatePuntoEnvioDto } from './dto/update.dto';
import { MayoristasService } from '../mayoristas/mayoristas.service';

@Injectable()
export class PuntoEnvioService {
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


  async getAllPuntosEnvio(): Promise<{
    success: boolean;
    puntosEnvio?: PuntoEnvio[];
    total?: number;
    message?: string;
    error?: string;
  }> {
    try {
      const puntosEnvio = await this.puntoEnvioModel.find({}).sort({ createAt: -1 })
      const formatted = puntosEnvio.map((doc) => ({
        _id: doc._id.toString(),
        nombre: doc.nombre || '',
        cutoffTime: doc.cutoffTime,
        createdAt: (doc.createdAt as unknown as Date).toISOString(),
        updatedAt: (doc.updatedAt as unknown as Date).toISOString(),
      }));
      return {
        success: true,
        puntosEnvio: formatted,
        total: formatted.length,
      };
    } catch (error) {
      return {
        success: false,
        puntosEnvio: [],
        total: 0,
        error: 'GET_ALL_PUNTOS_ENVIO_MONGO_ERROR',
      };
    }
  }



  async getPuntoEnvioByName(name: string): Promise<{
    success: boolean;
    puntoEnvio?: PuntoEnvio;
    message?: string;
    error?: string;
  }> {
    const puntoEnvio = await this.puntoEnvioModel.findOne({
      nombre: { $regex: new RegExp(`^${name}$`, 'i') },
    });

    if (!puntoEnvio) {
      throw new NotFoundException({
        message: 'Punto de envío no encontrado',
        error: 'PUNTO_ENVIO_NOT_FOUND',
      });
    }

    return {
      success: true,
      puntoEnvio: {
        _id: puntoEnvio._id.toString(),
        nombre: puntoEnvio.nombre,
        cutoffTime: puntoEnvio.cutoffTime,
        createdAt: (puntoEnvio.createdAt as unknown as Date).toISOString(),
        updatedAt: (puntoEnvio.updatedAt as unknown as Date).toISOString(),
      },
    };
  }



  async getPuntoEnvioById(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException({ message: 'ID inválido', error: 'INVALID_ID' });
    }
    const puntoEnvio = await this.puntoEnvioModel.findById(id);
    if (!puntoEnvio) {
      throw new NotFoundException({
        message: 'Punto de envío no encontrado',
        error: 'PUNTO_ENVIO_NOT_FOUND',
      });
    }
    return {
      success: true,
      puntoEnvio: {
        _id: puntoEnvio._id.toString(),
        nombre: puntoEnvio.nombre,
        cutoffTime: puntoEnvio.cutoffTime,
        createdAt: (puntoEnvio.createdAt as unknown as Date).toISOString(),
        updatedAt: (puntoEnvio.updatedAt as unknown as Date).toISOString(),
      },
    };
  }




  async createPuntoEnvio(data: PuntoEnvioDto): Promise<{
    success: boolean;
    puntoEnvio?: PuntoEnvio;
    message?: string;
    error?: string;
  }> {
    try {
      const existingPuntoEnvio = await this.puntoEnvioModel.findOne({
        nombre: { $regex: new RegExp(`^${data.nombre}$`, 'i') },
      });
      if (existingPuntoEnvio) {
        return {
          success: false,
          message: 'Ya existe un punto de envío con ese nombre',
          error: 'PUNTO_ENVIO_ALREADY_EXISTS',
        };
      }

      const now = new Date();
      const puntoEnvioDoc = {
        nombre: data.nombre,
        cutoffTime: data.cutoffTime,
        createdAt: now,
        updatedAt: now,
      };
      const result = await this.puntoEnvioModel.create(puntoEnvioDoc)
      const newPuntoEnvio: PuntoEnvio = {
        _id: result._id.toString(),
        nombre: puntoEnvioDoc.nombre,
        cutoffTime: puntoEnvioDoc.cutoffTime,
        createdAt: puntoEnvioDoc.createdAt.toISOString(),
        updatedAt: puntoEnvioDoc.updatedAt.toISOString(),
      };
      return {
        success: true,
        puntoEnvio: newPuntoEnvio,
        message: 'Punto de envío creado exitosamente',
      };
    } catch (error) {
      console.error('Error in createPuntoEnvioMongo:', error);
      return {
        success: false,
        message: 'Error al crear el punto de envío',
        error: 'CREATE_PUNTO_ENVIO_MONGO_ERROR',
      };
    }
  }



  async update(id: string, dto: UpdatePuntoEnvioDto) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException({ message: 'ID inválido', error: 'INVALID_ID' });
    }

    const existing = await this.puntoEnvioModel.findById(id);
    if (!existing) {
      throw new NotFoundException({ message: 'Punto de envío no encontrado', error: 'PUNTO_ENVIO_NOT_FOUND' });
    }

    if (dto.nombre) {
      const duplicate = await this.puntoEnvioModel.findOne({
        nombre: { $regex: new RegExp(`^${dto.nombre}$`, 'i') },
        _id: { $ne: id },
      });

      if (duplicate) {
        throw new ConflictException({
          message: 'Ya existe otro punto de envío con ese nombre',
          error: 'PUNTO_ENVIO_NAME_ALREADY_EXISTS',
        });
      }
    }

    const updated = await this.puntoEnvioModel.findByIdAndUpdate(
      id,
      { $set: dto },
      { new: true },
    );

    return {
      success: true,
      puntoEnvio: {
        _id: updated._id.toString(),
        nombre: updated.nombre,
        cutoffTime: updated.cutoffTime,
        createdAt: (updated.createdAt as unknown as Date).toISOString(),
        updatedAt: (updated.updatedAt as unknown as Date).toISOString(),
      },
      message: 'Punto de envío actualizado exitosamente',
    };
  }

  async remove(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException({ message: 'ID inválido', error: 'INVALID_ID' });
    }

    const existing = await this.puntoEnvioModel.findById(id);
    if (!existing) {
      throw new NotFoundException({ message: 'Punto de envío no encontrado', error: 'PUNTO_ENVIO_NOT_FOUND' });
    }

    await Promise.all([
      this.puntoEnvioModel.deleteOne({ _id: id }),
      // this.stockModel.deleteMany({ puntoEnvioId: id }),
      // this.detalleEnvioModel.deleteMany({ puntoEnvioId: id }),
    ]);

    return {
      success: true,
      message: 'Punto de envío eliminado exitosamente',
    };
  }



  //funcion para ajustar 
  async adjustDeliveryDateByCutoff(deliveryDate: Date, puntoEnvioName?: string): Promise<Date> {
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
