import { Module } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CouponsController } from './coupons.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { CouponSchema, Coupon } from '../../schemas/coupon.schema';
import { PaginationModule } from '../pagination/pagination.module';
import { ProductsModule } from '../products/products.module';
import { OptionsModule } from '../options/options.module';

@Module({
  controllers: [CouponsController],
  providers: [CouponsService],
  imports: [
    MongooseModule.forFeature([
      {
        name: Coupon.name,
        schema: CouponSchema,
      },
    ]),
    PaginationModule,
    ProductsModule,
    OptionsModule,
  ],
  exports: [CouponsService],
})
export class CouponsModule {}
