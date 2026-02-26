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
import { ProveedoresService } from './proveedores.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';

@Controller('proveedores')
export class ProveedoresController {
    constructor(private readonly proveedoresService: ProveedoresService) { }

    @Post()
    create(@Body() createProveedorDto: CreateProveedorDto) {
        return this.proveedoresService.createProveedor(createProveedorDto);
    }

    /** GET /proveedores — solo activos */
    @Get()
    findAll() {
        return this.proveedoresService.getAllProveedores();
    }

    /** GET /proveedores/all — activos + inactivos */
    @Get('all')
    findAllIncludingInactive() {
        return this.proveedoresService.getAllProveedoresIncludingInactive();
    }

    /** GET /proveedores/search?q=término */
    @Get('search')
    search(@Query('q') q: string) {
        return this.proveedoresService.searchProveedores(q ?? '');
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.proveedoresService.getProveedorById(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateProveedorDto: UpdateProveedorDto) {
        return this.proveedoresService.updateProveedor(id, updateProveedorDto);
    }

    /** DELETE hace soft-delete (isActive: false), no elimina el documento */
    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.proveedoresService.deleteProveedor(id);
    }
}
