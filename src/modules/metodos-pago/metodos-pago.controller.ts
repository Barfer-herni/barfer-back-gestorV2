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
import { MetodosPagoService } from './metodos-pago.service';
import { CreateMetodoPagoDto } from './dto/create-metodo-pago.dto';
import { UpdateMetodoPagoDto } from './dto/update-metodo-pago.dto';

@Controller('metodos-pago')
export class MetodosPagoController {
    constructor(private readonly metodosPagoService: MetodosPagoService) { }

    @Post()
    create(@Body() createMetodoPagoDto: CreateMetodoPagoDto) {
        return this.metodosPagoService.create(createMetodoPagoDto);
    }

    @Post('initialize')
    initialize() {
        return this.metodosPagoService.initialize();
    }

    @Get('all')
    findAll() {
        return this.metodosPagoService.findAll();
    }

    @Get('stats')
    getStats() {
        return this.metodosPagoService.getStats();
    }

    @Get('search')
    search(@Query('q') q: string) {
        return this.metodosPagoService.search(q || '');
    }

    @Get()
    findAllActive() {
        return this.metodosPagoService.findAllActive();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.metodosPagoService.findOne(id);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateMetodoPagoDto: UpdateMetodoPagoDto,
    ) {
        return this.metodosPagoService.update(id, updateMetodoPagoDto);
    }

    @Delete(':id/soft')
    softDelete(@Param('id') id: string) {
        return this.metodosPagoService.softDelete(id);
    }

    @Delete(':id')
    removePermanently(@Param('id') id: string) {
        return this.metodosPagoService.removePermanently(id);
    }
}
