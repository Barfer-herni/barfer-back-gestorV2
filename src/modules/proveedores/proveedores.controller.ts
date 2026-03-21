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
import { Auth } from '../auth/decorators/auth.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../../common/enums/roles.enum';
import { ProveedoresService } from './proveedores.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';

@Controller('proveedores')
export class ProveedoresController {
    constructor(private readonly proveedoresService: ProveedoresService) { }

    @Post()
    @Auth(Roles.Admin)
    @Permissions('proveedores:edit', 'outputs:edit')
    create(@Body() createProveedorDto: CreateProveedorDto) {
        return this.proveedoresService.createProveedor(createProveedorDto);
    }

    /** GET /proveedores — solo activos */
    @Get()
    @Auth(Roles.User)
    @Permissions('proveedores:view', 'outputs:view')
    findAll() {
        return this.proveedoresService.getAllProveedores();
    }

    /** GET /proveedores/all — activos + inactivos */
    @Get('all')
    @Auth(Roles.User)
    @Permissions('proveedores:view', 'outputs:view')
    findAllIncludingInactive() {
        return this.proveedoresService.getAllProveedoresIncludingInactive();
    }

    /** GET /proveedores/search?q=término */
    @Get('search')
    @Auth(Roles.User)
    @Permissions('proveedores:view', 'outputs:view')
    search(@Query('q') q: string) {
        return this.proveedoresService.searchProveedores(q ?? '');
    }

    @Get(':id')
    @Auth(Roles.User)
    @Permissions('proveedores:view', 'outputs:view')
    findOne(@Param('id') id: string) {
        return this.proveedoresService.getProveedorById(id);
    }

    @Patch(':id')
    @Auth(Roles.Admin)
    @Permissions('proveedores:edit', 'outputs:edit')
    update(@Param('id') id: string, @Body() updateProveedorDto: UpdateProveedorDto) {
        return this.proveedoresService.updateProveedor(id, updateProveedorDto);
    }

    /** DELETE hace soft-delete (isActive: false), no elimina el documento */
    @Delete(':id')
    @Auth(Roles.Admin)
    @Permissions('proveedores:delete', 'outputs:edit')
    remove(@Param('id') id: string) {
        return this.proveedoresService.deleteProveedor(id);
    }
}
