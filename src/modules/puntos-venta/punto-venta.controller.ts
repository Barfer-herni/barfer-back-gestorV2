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


  @Post('create')
  create(@Body() dto: CreatePuntoVentaDto) {
    return this.service.createPuntoVenta(dto);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.service.getPuntosVenta(query);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.getPuntoVentaById(id);
  }


  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePuntoVentaDto,
  ): any {
    return this.service.updatePuntoVenta(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.deletePuntoVenta(id);
  }
}
