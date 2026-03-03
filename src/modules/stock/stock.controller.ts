import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
} from '@nestjs/common';
import { StockService } from './stock.service';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { CalculateSalesDto } from './dto/calculate-sales.dto';
import { calculateSalesFromOrders } from './helpers/calculate-sales.helper';

@Controller('stock')
export class StockController {
    constructor(private readonly stockService: StockService) { }

    @Post()
    create(@Body() createStockDto: CreateStockDto) {
        return this.stockService.createStock(createStockDto);
    }

    @Get('/products-for-stock')
    getProductsForStock() {
        return this.stockService.getProductsForStock();
    }

    @Post('calculate-sales')
    calculateSales(@Body() calculateSalesDto: CalculateSalesDto) {
        const { product, orders } = calculateSalesDto;
        const totalQuantity = calculateSalesFromOrders(product, orders);
        return {
            success: true,
            totalQuantity,
            product: product.product,
            message: 'Cálculo de ventas completado'
        };
    }

    @Get('punto-envio/:puntoEnvioId')
    findByPuntoEnvio(@Param('puntoEnvioId') puntoEnvioId: string) {
        return this.stockService.getStockByPuntoEnvio(puntoEnvioId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.stockService.getStockById(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateStockDto: UpdateStockDto) {
        return this.stockService.updateStock(id, updateStockDto);
    }

    @Post('initialize')
    initializeStockForDate(@Body() data: { puntoEnvio: string; date: string }) {
        return this.stockService.initializeStockForDate(data.puntoEnvio, data.date);
    }

    @Post('recalculate')
    recalculateStockChain(@Body() data: { puntoEnvio: string; startDate: string }) {
        return this.stockService.recalculateStockChain(data.puntoEnvio, data.startDate);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.stockService.deleteStock(id);
    }

}
