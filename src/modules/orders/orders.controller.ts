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
  UseGuards,
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
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guard/permissions.guard';
import { AuthGuard } from '../auth/guard/auth.guard';

@Controller('orders')
// @UseGuards(AuthGuard, PermissionsGuard) // We can apply them individually to routes to be safe, or globally.
// Orders also has @Auth(Roles.User) which uses AuthGuard and RolesGuard.
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  @Post()
  @Auth(Roles.User)
  @Permissions('table:edit')
  create(@Body() data: OrderDto) {
    return this.ordersService.createOrder(data);
  }

  @Post('calculate-price')
  @Auth(Roles.User)
  // No strict permission needed yet just to calculate price
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
  @Permissions('table:edit')
  duplicate(@Param('id') id: string) {
    return this.ordersService.duplicateOrder(id);
  }

  @Post('status-bulk')
  @Auth(Roles.User)
  @Permissions('table:edit')
  updateStatusBulk(@Body() data: { ids: string[]; status: string }) {
    return this.ordersService.updateOrdersStatusBulk(data.ids, data.status);
  }

  @Patch(':id')
  @Auth(Roles.User)
  @Permissions('table:edit', 'stock:edit')
  update(@Param('id') id: string, @Body() data: UpdateOrderDto) {
    return this.ordersService.updateOrder(id, data);
  }

  @Get('all')
  @Auth(Roles.User)
  @Permissions('table:view')
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
  @Permissions('table:edit')
  undoLastChange() {
    return this.ordersService.undoLastChange();
  }

  @Delete('backups')
  @Auth(Roles.User)
  @Permissions('table:delete')
  clearBackups() {
    return this.ordersService.clearAllBackups();
  }

  @Get('balance-monthly')
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions('balance:view')
  getBalanceMonthly(@Query() params: BalanceMonthlyParamsDto) {
    return this.ordersService.getBalanceMonthly(params.startDate, params.endDate);
  }


  @Delete(':id')
  @Auth(Roles.User)
  @Permissions('table:delete')
  delete(@Param('id') id: string) {
    return this.ordersService.deleteOrder(id);
  }

  @Get('express')
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions('stock:view')
  getExpressOrders(
    @Query('puntoEnvio') puntoEnvio?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
  ) {
    return this.ordersService.getExpressOrders(puntoEnvio, from, to, page, limit);
  }

  @Get('express/metrics')
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions('stock:view')
  getExpressOrdersMetrics(
    @Query('puntoEnvio') puntoEnvio?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.ordersService.getExpressOrdersMetrics(puntoEnvio, from, to);
  }

  @Get('priority')
  @Auth(Roles.User)
  @Permissions('stock:view')
  getOrderPriority(
    @Query('fecha') fecha: string,
    @Query('puntoEnvio') puntoEnvio: string,
  ) {
    return this.ordersService.getOrderPriority(fecha, puntoEnvio);
  }

  @Post('express/:id/duplicate')
  @Auth(Roles.User)
  @Permissions('stock:edit')
  duplicateExpressOrder(
    @Param('id') id: string,
    @Body('targetPuntoEnvio') targetPuntoEnvio: string,
    @Req() req: Request,
  ) {
    return this.ordersService.duplicateExpressOrderAction(id, targetPuntoEnvio, (req as any).user);
  }

  @Post('priority')
  @Auth(Roles.User)
  @Permissions('stock:edit')
  saveOrderPriority(
    @Body('fecha') fecha: string,
    @Body('puntoEnvio') puntoEnvio: string,
    @Body('orderIds') orderIds: string[],
  ) {
    return this.ordersService.saveOrderPriorityAction(fecha, puntoEnvio, orderIds);
  }

  @Patch(':id/estado-envio')
  @Auth(Roles.User)
  @Permissions('table:edit')
  updateEstadoEnvio(
    @Param('id') id: string,
    @Body('estadoEnvio') estadoEnvio: string,
  ) {
    return this.ordersService.updateEstadoEnvioAction(id, estadoEnvio);
  }

  @Get('count-by-day')
  @UseGuards(AuthGuard, PermissionsGuard)
  @Permissions('table:view')
  countOrdersByDay(
    @Query('puntoEnvio') puntoEnvio: string,
    @Query('date') date: string,
  ) {
    return this.ordersService.countOrdersByDay(puntoEnvio, date);
  }

}
