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

    /**
     * POST /stock
     * Crea un nuevo registro de stock.
     */
    @Post()
    create(@Body() createStockDto: CreateStockDto) {
        return this.stockService.createStock(createStockDto);
    }

    /**
     * POST /stock/calculate-sales
     * Calcula la cantidad de productos vendidos a partir de una lista de órdenes.
     */
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

    /**
     * GET /stock/punto-envio/:puntoEnvioId
     * Obtiene todo el stock de un punto de envío.
     */
    @Get('punto-envio/:puntoEnvioId')
    findByPuntoEnvio(@Param('puntoEnvioId') puntoEnvioId: string) {
        return this.stockService.getStockByPuntoEnvio(puntoEnvioId);
    }

    /**
     * GET /stock/:id
     * Obtiene un registro de stock por su ID.
     */
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.stockService.getStockById(id);
    }

    /**
     * PATCH /stock/:id
     * Actualiza parcialmente un registro de stock.
     */
    @Patch(':id')
    update(@Param('id') id: string, @Body() updateStockDto: UpdateStockDto) {
        return this.stockService.updateStock(id, updateStockDto);
    }

    /**
     * DELETE /stock/:id
     * Elimina un registro de stock.
     */
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.stockService.deleteStock(id);
    }
}
