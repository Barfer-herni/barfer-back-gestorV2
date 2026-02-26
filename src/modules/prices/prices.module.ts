import { Module, forwardRef } from '@nestjs/common';
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
import { PricesService } from './prices.service';
import { PricesController } from './prices.controller';


import { Prices, PricesSchema } from '../../schemas/prices.schema';
import { TemplatePricesProducts, TemplatePricesProductsSchema } from '../../schemas/template_prices_products.schema';

@Module({
  controllers: [PricesController],
  providers: [PricesService],
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
      {
        name: Prices.name,
        schema: PricesSchema,
      },
      {
        name: TemplatePricesProducts.name,
        schema: TemplatePricesProductsSchema,
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
    PricesService,
    MongooseModule,
  ],
})
export class PricesModule { }
