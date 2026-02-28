import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
} from '@nestjs/common';
import { CategoriasGestorService } from './categorias-gestor.service';
import { CreateCategoriaGestorDto } from './dto/create-categoria-gestor.dto';
import { UpdateCategoriaGestorDto } from './dto/update-categoria-gestor.dto';

@Controller('categorias-gestor')
export class CategoriasGestorController {
    constructor(private readonly categoriasGestorService: CategoriasGestorService) { }

    @Post()
    create(@Body() createCategoriaGestorDto: CreateCategoriaGestorDto) {
        return this.categoriasGestorService.create(createCategoriaGestorDto);
    }

    @Post('initialize')
    initialize() {
        return this.categoriasGestorService.initialize();
    }

    @Post('ensure-sueldos')
    ensureSueldosCategory() {
        return this.categoriasGestorService.ensureSueldosCategory();
    }

    @Get('all')
    findAll() {
        return this.categoriasGestorService.findAll();
    }

    @Get('stats')
    getStats() {
        return this.categoriasGestorService.getStats();
    }

    @Get('search')
    search(@Query('q') q: string) {
        return this.categoriasGestorService.search(q || '');
    }

    @Get()
    findAllActive() {
        return this.categoriasGestorService.findAllActive();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.categoriasGestorService.findOne(id);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateCategoriaGestorDto: UpdateCategoriaGestorDto,
    ) {
        return this.categoriasGestorService.update(id, updateCategoriaGestorDto);
    }

    @Delete(':id/soft')
    softDelete(@Param('id') id: string) {
        return this.categoriasGestorService.softDelete(id);
    }

    @Delete(':id')
    removePermanently(@Param('id') id: string) {
        return this.categoriasGestorService.removePermanently(id);
    }
}
