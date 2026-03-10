import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { SalidasService } from './salidas.service';
import { CreateSalidaDto } from './dto/create-salida.dto';
import { UpdateSalidaDto } from './dto/update-salida.dto';
import { SalidasFilters } from './interfaces/salidas.interfaces';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guard/permissions.guard';
import { AuthGuard } from '../auth/guard/auth.guard';

@Controller('salidas')
@UseGuards(AuthGuard, PermissionsGuard)
export class SalidasController {
    constructor(private readonly salidasService: SalidasService) { }

    @Post()
    @Permissions('outputs:create')
    create(@Body() createSalidaDto: CreateSalidaDto) {
        return this.salidasService.createSalida(createSalidaDto);
    }

    @Get()
    @Permissions('outputs:view')
    findAll() {
        return this.salidasService.getAllSalidas();
    }

    /**
     * GET /salidas/paginated?pageIndex=0&pageSize=50...
     */
    @Get('paginated')
    @Permissions('outputs:view')
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
    @Permissions('outputs:view_statistics')
    getStatsByMonth(
        @Query('year') year: string,
        @Query('month') month: string,
    ) {
        return this.salidasService.getSalidasStatsByMonth(parseInt(year, 10), parseInt(month, 10));
    }

    @Get('date-range')
    @Permissions('outputs:view')
    getByDateRange(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.salidasService.getSalidasByDateRange(new Date(startDate), new Date(endDate));
    }

    // ── Analytics ──────────────────────────────────────────────────────────────

    @Get('analytics/category')
    @Permissions('outputs:view_statistics')
    getCategoryAnalytics(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.salidasService.getSalidasCategoryAnalytics(
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined,
        );
    }

    @Get('analytics/type')
    @Permissions('outputs:view_statistics')
    getTypeAnalytics(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.salidasService.getSalidasTypeAnalytics(
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined,
        );
    }

    @Get('analytics/monthly')
    @Permissions('outputs:view_statistics')
    getMonthlyAnalytics(
        @Query('categoriaId') categoriaId?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.salidasService.getSalidasMonthlyAnalytics(
            categoriaId,
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined,
        );
    }

    @Get('analytics/overview')
    @Permissions('outputs:view_statistics')
    getOverviewAnalytics(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.salidasService.getSalidasOverviewAnalytics(
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined,
        );
    }

    @Get('categorias')
    @Permissions('outputs:view')
    getCategorias() {
        return this.salidasService.getAllCategorias();
    }

    @Get(':id')
    @Permissions('outputs:view')
    findOne(@Param('id') id: string) {
        return this.salidasService.getSalidaById(id);
    }

    @Patch(':id')
    @Permissions('outputs:edit')
    update(@Param('id') id: string, @Body() updateSalidaDto: UpdateSalidaDto) {
        return this.salidasService.updateSalida(id, updateSalidaDto);
    }

    @Delete(':id')
    @Permissions('outputs:delete')
    remove(@Param('id') id: string) {
        return this.salidasService.deleteSalida(id);
    }
}
