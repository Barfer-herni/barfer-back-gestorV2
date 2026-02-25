import { Module, forwardRef } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { UsersModule } from '../users/users.module';
import { ProductsModule } from '../products/products.module';
import { AddressModule } from '../address/address.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from '../../schemas/order.schema';
import { OptionsModule } from '../options/options.module';
import { DeliveryAreasModule } from '../delivery-areas/delivery-areas.module';
import { DiscountsModule } from '../discounts/discounts.module';
import { Mayoristas, MayoristaSchema } from '../../schemas/mayoristas.schema';
import { PuntoEnvio, PuntoEnvioSchema } from '../../schemas/punto-envio.schema';
import { PuntosVenta, PuntosVentaSchema } from '../../schemas/puntos-venta.schema';
import { MayoristasModule } from '../mayoristas/mayoristas.module';
import { PuntoEnvioModule } from '../punto-envio/punto-envio.module';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
  imports: [
    MongooseModule.forFeature([
      {
        name: Order.name,
        schema: OrderSchema,
      },
      {
        name: Mayoristas.name,
        schema: MayoristaSchema,
      },
      {
        name: PuntoEnvio.name,
        schema: PuntoEnvioSchema,
      },
      {
        name: PuntosVenta.name,
        schema: PuntosVentaSchema,
      },
    ]),
    UsersModule,
    ProductsModule,
    AddressModule,
    OptionsModule,
    DeliveryAreasModule,
    DiscountsModule,
    MayoristasModule,
    forwardRef(() => PuntoEnvioModule),
  ],
  exports: [
    OrdersService,
    MongooseModule,
  ],
})
export class OrdersModule { }
