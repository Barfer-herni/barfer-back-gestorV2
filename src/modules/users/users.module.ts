import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { User, UserSchema } from '../../schemas/user.schema';
import { UsersController } from './users.controller';
import { Order, OrderSchema } from '../../schemas/order.schema';
import { Address, AddressSchema } from '../../schemas/address.schema';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
  imports: [
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: Order.name,
        schema: OrderSchema,
      },
      {
        name: Address.name,
        schema: AddressSchema,
      },
    ]),
  ],
})
export class UsersModule { }
