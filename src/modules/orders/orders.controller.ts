import {
  Body,
  Controller,
  Get,
  Delete,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PaginationDto } from '../../common/dto/pagination/pagination.dto';
import { Roles } from '../../common/enums/roles.enum';
import { Auth } from '../auth/decorators/auth.decorator';
import { OrderDto } from './dto/order.dto';
import { UpdateOrderDto } from './dto/update.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  @Post()
  @Auth(Roles.User)
  create(@Body() data: OrderDto) {
    return this.ordersService.createOrder(data);
  }

  @Patch(':id')
  @Auth(Roles.User)
  update(@Param('id') id: string, @Body() data: UpdateOrderDto) {
    return this.ordersService.updateOrder(id, data);
  }

  @Delete(':id')
  @Auth(Roles.User)
  delete(@Param('id') id: string) {
    return this.ordersService.deleteOrder(id);
  }

}
