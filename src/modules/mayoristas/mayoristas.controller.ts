import {
    Body,
    Controller,
    Get,
    Delete,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { MayoristasService } from './mayoristas.service';
import { CreateMayoristaDto } from './dto/create-mayorista.dto';
import { UpdateMayoristaDto } from './dto/update-mayorista.dto';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guard/permissions.guard';
import { AuthGuard } from '../auth/guard/auth.guard';

@Controller('mayoristas')
@UseGuards(AuthGuard, PermissionsGuard)
export class MayoristasController {
    constructor(private readonly mayoristasService: MayoristasService) { }

    @Post()
    @Permissions('mayoristas:create')
    create(@Body() createMayoristaDto: CreateMayoristaDto) {
        return this.mayoristasService.createMayoristaPerson(createMayoristaDto);
    }

    @Get()
    @Permissions('mayoristas:view')
    findAll() {
        return this.mayoristasService.getMayoristaPersons();
    }

    @Get('search')
    @Permissions('mayoristas:view')
    search(@Query('q') q: string) {
        return this.mayoristasService.searchMayoristas(q);
    }

    @Get('find-by-name')
    @Permissions('mayoristas:view')
    findByName(
        @Query('name') name: string,
        @Query('lastName') lastName: string,
    ) {
        return this.mayoristasService.findMayoristaByName(name, lastName);
    }

    @Get(':id')
    @Permissions('mayoristas:view')
    findOne(@Param('id') id: string) {
        return this.mayoristasService.getMayoristaPersonById(id);
    }

    @Patch(':id')
    @Permissions('mayoristas:edit')
    update(
        @Param('id') id: string,
        @Body() updateMayoristaDto: UpdateMayoristaDto,
    ) {
        return this.mayoristasService.updateMayoristaPerson(id, updateMayoristaDto);
    }

    @Delete(':id')
    @Permissions('mayoristas:delete')
    remove(@Param('id') id: string) {
        return this.mayoristasService.deleteMayoristaPerson(id);
    }
}

