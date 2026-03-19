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
import { Auth } from '../auth/decorators/auth.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../../common/enums/roles.enum';
import { PuntosVentaService } from './punto-venta.service'
import { CreatePuntoVentaDto } from './dto/punto-venta.dto';
import { UpdatePuntoVentaDto } from './dto/update.dto';

@Controller('puntos-venta')
export class PuntosVentaController {
  constructor(private readonly service: PuntosVentaService) { }


  @Post('create')
  @Auth(Roles.User)
  @Permissions('mayoristas:create')
  create(@Body() dto: CreatePuntoVentaDto) {
    return this.service.createPuntoVenta(dto);
  }

  @Get('stats')
  @Auth(Roles.User)
  @Permissions('mayoristas:view_statistics')
  getStats(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getPuntosVentaStats(from, to);
  }

  @Get()
  @Auth(Roles.User)
  @Permissions('mayoristas:view')
  findAll(@Query() query: any) {
    return this.service.getPuntosVenta(query);
  }

  @Get(':id')
  @Auth(Roles.User)
  @Permissions('mayoristas:view')
  findById(@Param('id') id: string) {
    return this.service.getPuntoVentaById(id);
  }


  @Patch(':id')
  @Auth(Roles.User)
  @Permissions('mayoristas:edit')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePuntoVentaDto,
  ): any {
    return this.service.updatePuntoVenta(id, dto);
  }

  @Delete(':id')
  @Auth(Roles.User)
  @Permissions('mayoristas:delete')
  remove(@Param('id') id: string) {
    return this.service.deletePuntoVenta(id);
  }
}

