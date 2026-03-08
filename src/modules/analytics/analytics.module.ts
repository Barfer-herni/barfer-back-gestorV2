import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { Order, OrderSchema } from '../../schemas/order.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { Product, ProductSchema } from '../../schemas/product.schema';
import { PaymentsGestor, PaymentsGestorSchema } from '../../schemas/payments-gestor.schema';
import { Salidas, SalidasSchema } from '../../schemas/salidas.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: User.name, schema: UserSchema },
      { name: Product.name, schema: ProductSchema },
      { name: PaymentsGestor.name, schema: PaymentsGestorSchema },
      { name: Salidas.name, schema: SalidasSchema },
    ]),
  ],
  providers: [AnalyticsService],
  controllers: [AnalyticsController],
  exports: [AnalyticsService],
})
export class AnalyticsModule { }

export default AnalyticsModule;
