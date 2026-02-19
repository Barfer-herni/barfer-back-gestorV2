import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { PuntosVentaService } from './punto-venta.service'
import { CreatePuntoVentaDto } from './dto/punto-venta.dto';
import { UpdatePuntoVentaDto } from './dto/update.dto';

@Controller('puntos-venta')
export class PuntosVentaController {
  constructor(private readonly service: PuntosVentaService) { }

  @Get()
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  create(@Body() dto: CreatePuntoVentaDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePuntoVentaDto,
  ): any {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.softDelete(id);
  }
}
