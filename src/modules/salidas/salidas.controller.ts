import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { SalidasService } from './salidas.service';
import { CreateSalidaDto } from './dto/create-salida.dto';
import { UpdateSalidaDto } from './dto/update-salida.dto';
import { SalidasFilters } from './interfaces/salidas.interfaces';

@Controller('salidas')
export class SalidasController {
    constructor(private readonly salidasService: SalidasService) { }

    @Post()
    create(@Body() createSalidaDto: CreateSalidaDto) {
        return this.salidasService.createSalida(createSalidaDto);
    }

    @Get()
    findAll() {
        return this.salidasService.getAllSalidas();
    }

    /**
     * GET /salidas/paginated?pageIndex=0&pageSize=50&searchTerm=...&categoriaId=...
     * &marca=...&metodoPagoId=...&tipo=...&tipoRegistro=...&fecha=...
     * &fechaDesde=...&fechaHasta=...
     */
    @Get('paginated')
    findPaginated(
        @Query('pageIndex') pageIndex?: string,
        @Query('pageSize') pageSize?: string,
        @Query('searchTerm') searchTerm?: string,
        @Query('categoriaId') categoriaId?: string,
        @Query('marca') marca?: string,
        @Query('metodoPagoId') metodoPagoId?: string,
        @Query('tipo') tipo?: string,
        @Query('tipoRegistro') tipoRegistro?: string,
        @Query('fecha') fecha?: string,
        @Query('fechaDesde') fechaDesde?: string,
        @Query('fechaHasta') fechaHasta?: string,
    ) {
        const filters: SalidasFilters = {};
        if (searchTerm) filters.searchTerm = searchTerm;
        if (categoriaId) filters.categoriaId = categoriaId;
        if (marca) filters.marca = marca;
        if (metodoPagoId) filters.metodoPagoId = metodoPagoId;
        if (tipo === 'ORDINARIO' || tipo === 'EXTRAORDINARIO') filters.tipo = tipo;
        if (tipoRegistro === 'BLANCO' || tipoRegistro === 'NEGRO') filters.tipoRegistro = tipoRegistro;
        if (fecha) filters.fecha = fecha;
        if (fechaDesde) filters.fechaDesde = new Date(fechaDesde);
        if (fechaHasta) filters.fechaHasta = new Date(fechaHasta);

        return this.salidasService.getSalidasPaginated({
            pageIndex: pageIndex ? parseInt(pageIndex, 10) : 0,
            pageSize: pageSize ? parseInt(pageSize, 10) : 50,
            filters,
        });
    }

    @Get('stats')
    getStatsByMonth(
        @Query('year') year: string,
        @Query('month') month: string,
    ) {
        return this.salidasService.getSalidasStatsByMonth(parseInt(year, 10), parseInt(month, 10));
    }

    @Get('date-range')
    getByDateRange(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.salidasService.getSalidasByDateRange(new Date(startDate), new Date(endDate));
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.salidasService.getSalidaById(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateSalidaDto: UpdateSalidaDto) {
        return this.salidasService.updateSalida(id, updateSalidaDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.salidasService.deleteSalida(id);
    }
}
