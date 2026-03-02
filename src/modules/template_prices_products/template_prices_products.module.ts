import { Module, forwardRef } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ProductsModule } from '../products/products.module';
import { AddressModule } from '../address/address.module';
import { MongooseModule } from '@nestjs/mongoose';
import { OptionsModule } from '../options/options.module';
import { DeliveryAreasModule } from '../delivery-areas/delivery-areas.module';
import { DiscountsModule } from '../discounts/discounts.module';
import { MayoristasModule } from '../mayoristas/mayoristas.module';
import { PuntoEnvioModule } from '../punto-envio/punto-envio.module';
import { TemplatePricesProducts, TemplatePricesProductsSchema } from '../../schemas/template_prices_products.schema';
import { TemplatePricesProductsController } from './template_prices_products.controller';
import { TemplatePricesProductsService } from './template_prices_products.service';

@Module({
    controllers: [TemplatePricesProductsController],
    providers: [TemplatePricesProductsService],
    imports: [
        MongooseModule.forFeature([
            {
                name: TemplatePricesProducts.name,
                schema: TemplatePricesProductsSchema,
            },
        ]),
    ],
    exports: [
        TemplatePricesProductsService,
        MongooseModule,
    ],
})
export class TemplatePricesProductsModule { }
