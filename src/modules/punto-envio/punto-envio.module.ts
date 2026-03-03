import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ProductsModule } from '../products/products.module';
import { AddressModule } from '../address/address.module';
import { MongooseModule } from '@nestjs/mongoose';
import { OptionsModule } from '../options/options.module';
import { DeliveryAreasModule } from '../delivery-areas/delivery-areas.module';
import { DiscountsModule } from '../discounts/discounts.module';
import { Mayoristas, MayoristaSchema } from '../../schemas/mayoristas.schema';
import { PuntoEnvioController } from './punto-envio.controller';
import { PuntoEnvioService } from './punto-envio.service';
import { PuntoEnvioSchema, PuntoEnvio } from '../../schemas/punto-envio.schema';
import { OrdersModule } from '../orders/orders.module';
import { forwardRef } from '@nestjs/common';
import { MayoristasModule } from '../mayoristas/mayoristas.module';

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
    DeliveryAreasModule,
    DiscountsModule,
    MayoristasModule,
    forwardRef(() => OrdersModule), // ← cambiá esto
  ],
  exports: [PuntoEnvioService],
})
export class PuntoEnvioModule { }
