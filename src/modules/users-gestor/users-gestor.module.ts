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
import { UsersGestorController } from './users-gestor.controller';
import { UsersGestorService } from './users-gestor.service';
import { UserGestor, UserGestorSchema } from '../../schemas/user-gestor.schema';

@Module({
  controllers: [UsersGestorController],
  providers: [UsersGestorService],
  imports: [
    MongooseModule.forFeature([
      {
        name: UserGestor.name,
        schema: UserGestorSchema
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
  exports: [UsersGestorService],
})
export class UsersGestorModule { }
