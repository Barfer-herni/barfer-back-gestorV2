import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ProductsModule } from '../products/products.module';
import { AddressModule } from '../address/address.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from '../../schemas/order.schema';
import { OptionsModule } from '../options/options.module';
import { CouponsModule } from '../coupons/coupons.module';
import { DeliveryAreasModule } from '../delivery-areas/delivery-areas.module';
import { DiscountsModule } from '../discounts/discounts.module';
import { Mayoristas, MayoristaSchema } from '../../schemas/mayoristas.schema';
import { PuntoEnvioController } from './punto-envio.controller';
import { PuntoEnvioService } from './punto-envio.service';
import { PuntoEnvioSchema, PuntoEnvio } from 'src/schemas/punto-envio.schema';

@Module({
  controllers: [PuntoEnvioController],
  providers: [PuntoEnvioService],
  imports: [
    MongooseModule.forFeature([
      {
        name: PuntoEnvio.name,
        schema: PuntoEnvioSchema
      },
    ]),
    UsersModule,
    ProductsModule,
    AddressModule,
    OptionsModule,
    CouponsModule,
    DeliveryAreasModule,
    DiscountsModule,
  ],
  exports: [PuntoEnvioService],
})
export class PuntoEnvioModule { }
