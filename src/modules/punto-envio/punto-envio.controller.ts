import {
  Body,
  Controller,
  Get,
  Delete,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PaginationDto } from '../../common/dto/pagination/pagination.dto';
import { Roles } from '../../common/enums/roles.enum';
import { Auth } from '../auth/decorators/auth.decorator';
import { PuntoEnvioDto } from './dto/punto-envio.dto';
import { UpdatePuntoEnvioDto } from './dto/update.dto';
import { PuntoEnvioService } from './punto-envio.service';
import { PuntoEnvio } from '../../schemas/punto-envio.schema';

@Controller('puntos-envio')
export class PuntoEnvioController {
  constructor(private readonly puntoEnvioService: PuntoEnvioService) { }

  @Get()
  // @Auth(Roles.User)
  getAll() {
    return this.puntoEnvioService.getAllPuntosEnvio();
  }

  @Get('by-name/:name')
  @Auth(Roles.User)
  getByName(@Param('name') name: string) {
    return this.puntoEnvioService.getPuntoEnvioByName(name);
  }

  @Get(':id')
  @Auth(Roles.User)
  getById(@Param('id') id: string) {
    return this.puntoEnvioService.getPuntoEnvioById(id);
  }

  @Post()
  @Auth(Roles.User)
  create(@Body() data: PuntoEnvioDto): Promise<{
    success: boolean;
    puntoEnvio?: PuntoEnvio;
    message?: string;
    error?: string;
  }> {
    return this.puntoEnvioService.createPuntoEnvio(data);
  }

  @Patch(':id')
  @Auth(Roles.User)
  update(@Param('id') id: string, @Body() dto: UpdatePuntoEnvioDto) {
    return this.puntoEnvioService.update(id, dto);
  }

  @Delete(':id')
  @Auth(Roles.User)
  remove(@Param('id') id: string) {
    return this.puntoEnvioService.remove(id);
  }
}
