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
import { GetAllOrdersParamsDto } from './dto/get-all-orders-params.dto';
import { BalanceMonthlyParamsDto } from './dto/balance.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  @Post()
  @Auth(Roles.User)
  create(@Body() data: OrderDto) {
    return this.ordersService.createOrder(data);
  }

  @Post('calculate-price')
  @Auth(Roles.User)
  calculatePrice(@Body() data: {
    items: Array<{
      name: string;
      fullName?: string;
      options: Array<{ name: string; quantity: number }>;
    }>;
    orderType: 'minorista' | 'mayorista';
    paymentMethod: string;
    deliveryDate?: string;
  }) {
    return this.ordersService.calculatePrice(
      data.items,
      data.orderType,
      data.paymentMethod,
      data.deliveryDate,
    );
  }

  @Post(':id/duplicate')
  @Auth(Roles.User)
  duplicate(@Param('id') id: string) {
    return this.ordersService.duplicateOrder(id);
  }

  @Post('status-bulk')
  @Auth(Roles.User)
  updateStatusBulk(@Body() data: { ids: string[]; status: string }) {
    return this.ordersService.updateOrdersStatusBulk(data.ids, data.status);
  }

  @Patch(':id')
  // @Auth(Roles.User)
  update(@Param('id') id: string, @Body() data: UpdateOrderDto) {
    return this.ordersService.updateOrder(id, data);
  }

  @Get('all')
  @Auth(Roles.User)
  getAll(@Query() params: GetAllOrdersParamsDto) {
    return this.ordersService.getAllOrders(params);
  }

  @Get('backups/count')
  @Auth(Roles.User)
  getBackupsCount() {
    return this.ordersService.getBackupsCount();
  }

  @Post('backups/undo')
  @Auth(Roles.User)
  undoLastChange() {
    return this.ordersService.undoLastChange();
  }

  @Delete('backups')
  @Auth(Roles.User)
  clearBackups() {
    return this.ordersService.clearAllBackups();
  }

  @Get('balance-monthly')
  // @Auth(Roles.User)
  getBalanceMonthly(@Query() params: BalanceMonthlyParamsDto) {
    return this.ordersService.getBalanceMonthly(params.startDate, params.endDate);
  }


  @Delete(':id')
  @Auth(Roles.User)
  delete(@Param('id') id: string) {
    return this.ordersService.deleteOrder(id);
  }

  @Get('express')
  // @Auth(Roles.User)
  getExpressOrders(
    @Query('puntoEnvio') puntoEnvio?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.ordersService.getExpressOrders(puntoEnvio, from, to);
  }

  @Get('priority')
  // @Auth(Roles.User)
  getOrderPriority(
    @Query('fecha') fecha: string,
    @Query('puntoEnvio') puntoEnvio: string,
  ) {
    return this.ordersService.getOrderPriority(fecha, puntoEnvio);
  }

  @Post('express/:id/duplicate')
  // @Auth(Roles.User)
  duplicateExpressOrder(
    @Param('id') id: string,
    @Body('targetPuntoEnvio') targetPuntoEnvio: string,
    @Req() req: Request,
  ) {
    return this.ordersService.duplicateExpressOrderAction(id, targetPuntoEnvio, (req as any).user);
  }

  @Post('priority')
  @Auth(Roles.User)
  saveOrderPriority(
    @Body('fecha') fecha: string,
    @Body('puntoEnvio') puntoEnvio: string,
    @Body('orderIds') orderIds: string[],
  ) {
    return this.ordersService.saveOrderPriorityAction(fecha, puntoEnvio, orderIds);
  }

  @Patch(':id/estado-envio')
  @Auth(Roles.User)
  updateEstadoEnvio(
    @Param('id') id: string,
    @Body('estadoEnvio') estadoEnvio: string,
  ) {
    return this.ordersService.updateEstadoEnvioAction(id, estadoEnvio);
  }

  @Get('count-by-day')
  // @Auth(Roles.User)
  countOrdersByDay(
    @Query('puntoEnvio') puntoEnvio: string,
    @Query('date') date: string,
  ) {
    return this.ordersService.countOrdersByDay(puntoEnvio, date);
  }

}
