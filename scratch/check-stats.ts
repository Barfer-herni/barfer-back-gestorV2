import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/modules/app/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { User } from '../src/schemas/user.schema';
import { Order } from '../src/schemas/order.schema';
import { Model } from 'mongoose';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userModel = app.get<Model<User>>(getModelToken(User.name));
  const orderModel = app.get<Model<Order>>(getModelToken(Order.name));

  const userCount = await userModel.countDocuments();
  const orderCount = await orderModel.countDocuments();


  // Check some order user emails
  const sampleOrders = await orderModel.find().limit(5).select('user.email');

  await app.close();
}

bootstrap();
