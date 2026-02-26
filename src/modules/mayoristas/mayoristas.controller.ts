import {
    Body,
    Controller,
    Get,
    Delete,
    Param,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { MayoristasService } from './mayoristas.service';
import { CreateMayoristaDto } from './dto/create-mayorista.dto';
import { UpdateMayoristaDto } from './dto/update-mayorista.dto';

@Controller('mayoristas')
export class MayoristasController {
    constructor(private readonly mayoristasService: MayoristasService) { }

    @Post()
    create(@Body() createMayoristaDto: CreateMayoristaDto) {
        return this.mayoristasService.createMayoristaPerson(createMayoristaDto);
    }

    @Get()
    findAll() {
        return this.mayoristasService.getMayoristaPersons();
    }

    @Get('search')
    search(@Query('q') q: string) {
        return this.mayoristasService.searchMayoristas(q);
    }

    @Get('find-by-name')
    findByName(
        @Query('name') name: string,
        @Query('lastName') lastName: string,
    ) {
        return this.mayoristasService.findMayoristaByName(name, lastName);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.mayoristasService.getMayoristaPersonById(id);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateMayoristaDto: UpdateMayoristaDto,
    ) {
        return this.mayoristasService.updateMayoristaPerson(id, updateMayoristaDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.mayoristasService.deleteMayoristaPerson(id);
    }
}

