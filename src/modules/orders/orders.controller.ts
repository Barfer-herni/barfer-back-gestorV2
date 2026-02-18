import {
  Body,
  Controller,
  Get,
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
import { CartDto } from './dto/cart.dto';
import { OrderDto } from './dto/order.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Auth(Roles.User)
  create(@Body() createOrderDto: OrderDto, @Req() req: Request) {
    try {
      const clientIp =
        req.ip ||
        req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      return this.ordersService.create(createOrderDto, clientIp as string, userAgent);
    } catch (error) {
      console.error('CREATE ORDER ERROR: ', error);
    }
  }

  @Get()
  @Auth(Roles.Admin)
  findAll(@Query() pagination: PaginationDto) {
    return this.ordersService.findAll(pagination);
  }

  @Get('byUserEmail/:email')
  @Auth(Roles.User)
  findByUserEmail(
    @Param('email') email: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.ordersService.getByUserEmail(email, pagination);
  }

  @Get(':id')
  @Auth(Roles.User)
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch('status/:id')
  @Auth(Roles.Admin)
  update(@Param('id') id: string, @Body() updateStatusDto: UpdateStatusDto) {
    return this.ordersService.updateStatus(id, updateStatusDto);
  }

  @Post('mercadopago/webhook')
  mpWebhook(@Req() req: Request) {
    const { query } = req;
    return this.ordersService.mpWebhook(query);
  }

  @Post('validate-coupon')
  validateCoupon(@Body() cartDto: CartDto) {
    return this.ordersService.validateCoupon(cartDto);
  }
}
