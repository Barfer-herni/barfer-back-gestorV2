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
import { PuntoEnvioSchema, PuntoEnvio } from 'src/schemas/punto-envio.schema';
import { PuntosVentaController } from './punto-venta.controller';
import { PuntosVentaService } from './punto-venta.service';
import { PuntoEnvioService } from '../punto-envio/punto-envio.service';

@Module({
  controllers: [PuntosVentaController],
  providers: [PuntosVentaService],
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
export class PuntoVentaModule { }
