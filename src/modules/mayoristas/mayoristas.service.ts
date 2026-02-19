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

@Injectable()
export class MayoristasService {
    constructor(
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
    ) { }



    async createMayoristaPerson(data: any): Promise<{ success: boolean; isNew?: boolean; error?: string }> {
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
