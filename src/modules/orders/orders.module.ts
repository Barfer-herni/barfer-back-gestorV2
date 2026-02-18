import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { UsersModule } from '../users/users.module';
import { ProductsModule } from '../products/products.module';
import { AddressModule } from '../address/address.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from '../../schemas/order.schema';
import { OptionsModule } from '../options/options.module';
import { MercadoPagoModule } from '../mercado-pago/mercado-pago.module';
import { CouponsModule } from '../coupons/coupons.module';
import { PaginationModule } from '../pagination/pagination.module';
import { DeliveryAreasModule } from '../delivery-areas/delivery-areas.module';
import { GoogleSheetModule } from '../google-sheet/google-sheet.module';
import { MailerService } from '../mailer/mailer.service';
import { MetaConversionsService } from '../meta-conversions/meta-conversions.service';
import { DiscountCalculatorService } from './services/discount-calculator.service';
import { DiscountsModule } from '../discounts/discounts.module';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, MailerService, MetaConversionsService, DiscountCalculatorService],
  imports: [
    MongooseModule.forFeature([
      {
        name: Order.name,
        schema: OrderSchema,
      },
    ]),
    UsersModule,
    ProductsModule,
    AddressModule,
    OptionsModule,
    MercadoPagoModule,
    CouponsModule,
    PaginationModule,
    DeliveryAreasModule,
    GoogleSheetModule,
    DiscountsModule,
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
