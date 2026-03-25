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
import { Auth } from '../auth/decorators/auth.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../../common/enums/roles.enum';
import { CategoriasGestorService } from './categorias-gestor.service';
import { CreateCategoriaGestorDto } from './dto/create-categoria-gestor.dto';
import { UpdateCategoriaGestorDto } from './dto/update-categoria-gestor.dto';

@Controller('categorias-gestor')
export class CategoriasGestorController {
    constructor(private readonly categoriasGestorService: CategoriasGestorService) { }

    @Post()
    @Auth(Roles.User)
    @Permissions('balance:edit') // Categories gestor are usually for balance/outputs
    create(@Body() createCategoriaGestorDto: CreateCategoriaGestorDto) {
        return this.categoriasGestorService.create(createCategoriaGestorDto);
    }

    @Post('initialize')
    @Auth(Roles.User)
    @Permissions('balance:edit')
    initialize() {
        return this.categoriasGestorService.initialize();
    }

    @Post('ensure-sueldos')
    @Auth(Roles.User)
    @Permissions('balance:edit')
    ensureSueldosCategory() {
        return this.categoriasGestorService.ensureSueldosCategory();
    }

    @Get('all')
    @Auth(Roles.User)
    @Permissions('balance:view', 'outputs:view')
    findAll() {
        return this.categoriasGestorService.findAll();
    }

    @Get('stats')
    @Auth(Roles.User)
    @Permissions('balance:view')
    getStats() {
        return this.categoriasGestorService.getStats();
    }

    @Get('search')
    @Auth(Roles.User)
    @Permissions('balance:view')
    search(@Query('q') q: string) {
        return this.categoriasGestorService.search(q || '');
    }

    @Get()
    @Auth(Roles.User)
    @Permissions('balance:view')
    findAllActive() {
        return this.categoriasGestorService.findAllActive();
    }

    @Get(':id')
    @Auth(Roles.User)
    @Permissions('balance:view')
    findOne(@Param('id') id: string) {
        return this.categoriasGestorService.findOne(id);
    }

    @Patch(':id')
    @Auth(Roles.User)
    @Permissions('balance:edit')
    update(
        @Param('id') id: string,
        @Body() updateCategoriaGestorDto: UpdateCategoriaGestorDto,
    ) {
        return this.categoriasGestorService.update(id, updateCategoriaGestorDto);
    }

    @Delete(':id/soft')
    @Auth(Roles.User)
    @Permissions('balance:delete')
    softDelete(@Param('id') id: string) {
        return this.categoriasGestorService.softDelete(id);
    }

    @Delete(':id')
    @Auth(Roles.User)
    @Permissions('balance:delete')
    removePermanently(@Param('id') id: string) {
        return this.categoriasGestorService.removePermanently(id);
    }
}
