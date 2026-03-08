import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) { }

  @Get('average-order-value')
  async getAverageOrderValue() {
    return this.analyticsService.getAverageOrderValue();
  }

  @Get('category-sales')
  async getCategorySales(
    @Query('statusFilter') statusFilter?: string,
    @Query('limit') limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getCategorySales(statusFilter, limit ? Number(limit) : undefined, startDate, endDate);
  }

  @Get('client-categories-stats')
  async getClientCategoriesStats() {
    return this.analyticsService.getClientCategoriesStats();
  }

  @Get('client-categorization')
  async getClientCategorization() {
    return this.analyticsService.getClientCategorization();
  }

  @Get('client-general-stats')
  async getClientGeneralStats() {
    return this.analyticsService.getClientGeneralStats();
  }

  @Get('clients-by-category')
  async getClientsByCategory() {
    return this.analyticsService.getClientsByCategory();
  }

  @Get('clients-paginated')
  async getClientsPaginated(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.analyticsService.getClientsPaginated(page ? Number(page) : 1, limit ? Number(limit) : 20);
  }

  @Get('customer-frequency')
  async getCustomerFrequency() {
    return this.analyticsService.getCustomerFrequency();
  }

  @Get('customer-insights')
  async getCustomerInsights(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getCustomerInsights(startDate, endDate);
  }

  @Get('delivery-type-stats-by-month')
  async getDeliveryTypeStatsByMonth() {
    return this.analyticsService.getDeliveryTypeStatsByMonth();
  }

  @Get('orders-by-day')
  async getOrdersByDay(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getOrdersByDay(startDate, endDate);
  }

  @Get('orders-by-month')
  async getOrdersByMonth() {
    return this.analyticsService.getOrdersByMonth();
  }

  @Get('payment-method-stats')
  async getPaymentMethodStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getPaymentMethodStats(startDate, endDate);
  }

  @Get('payments-by-time-period')
  async getPaymentsByTimePeriod(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('periodType') periodType?: string,
  ) {
    return this.analyticsService.getPaymentsByTimePeriod(startDate, endDate, periodType);
  }

  @Get('product-sales')
  async getProductSales(
    @Query('statusFilter') statusFilter?: string,
    @Query('limit') limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getProductSales(statusFilter, limit ? Number(limit) : undefined, startDate, endDate);
  }

  @Get('products-by-time-period')
  async getProductsByTimePeriod(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.analyticsService.getProductsByTimePeriod(startDate, endDate);
  }

  @Get('product-timeline')
  async getProductTimeline(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('productIds') productIds?: string[],
  ) {
    return this.analyticsService.getProductTimeline(startDate, endDate, productIds);
  }

  @Get('purchase-frequency')
  async getPurchaseFrequency(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getPurchaseFrequency(startDate, endDate);
  }

  @Get('quantity-stats-by-month')
  async getQuantityStatsByMonth(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('puntoEnvio') puntoEnvio?: string,
  ) {
    return this.analyticsService.getQuantityStatsByMonth(startDate, endDate, puntoEnvio);
  }

  @Get('revenue-by-day')
  async getRevenueByDay(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getRevenueByDay(startDate, endDate);
  }
}

export default AnalyticsController;
