import { Module } from '@nestjs/common';
import { MayoristasService } from './mayoristas.service';
import { MayoristasController } from './mayoristas.controller';
import { UsersModule } from '../users/users.module';
import { ProductsModule } from '../products/products.module';
import { AddressModule } from '../address/address.module';
import { MongooseModule } from '@nestjs/mongoose';
import { OptionsModule } from '../options/options.module';
import { DeliveryAreasModule } from '../delivery-areas/delivery-areas.module';
import { DiscountsModule } from '../discounts/discounts.module';
import { Mayoristas, MayoristaSchema } from '../../schemas/mayoristas.schema';

@Module({
    controllers: [MayoristasController],
    providers: [MayoristasService],
    imports: [
        MongooseModule.forFeature([
            {
                name: Mayoristas.name,
                schema: MayoristaSchema,
            }
        ]),
        UsersModule,
        ProductsModule,
        AddressModule,
        OptionsModule,
        DeliveryAreasModule,
        DiscountsModule,
    ],
    exports: [MayoristasService],
})
export class MayoristasModule { }

