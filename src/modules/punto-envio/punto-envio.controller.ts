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
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PuntoEnvioDto } from './dto/punto-envio.dto';
import { UpdatePuntoEnvioDto } from './dto/update.dto';
import { PuntoEnvioService } from './punto-envio.service';
import { PuntoEnvio } from '../../schemas/punto-envio.schema';

@Controller('puntos-envio')
export class PuntoEnvioController {
  constructor(private readonly puntoEnvioService: PuntoEnvioService) { }

  @Get()
  @Auth(Roles.User)
  @Permissions('table:view') // Puntos envio are often part of table/shipping view
  getAll() {
    return this.puntoEnvioService.getAllPuntosEnvio();
  }

  @Get('by-name/:name')
  @Auth(Roles.User)
  @Permissions('table:view')
  getByName(@Param('name') name: string) {
    return this.puntoEnvioService.getPuntoEnvioByName(name);
  }

  @Get(':id')
  @Auth(Roles.User)
  @Permissions('table:view')
  getById(@Param('id') id: string) {
    return this.puntoEnvioService.getPuntoEnvioById(id);
  }

  @Post()
  @Auth(Roles.Admin)
  @Permissions('table:edit')
  create(@Body() data: PuntoEnvioDto): Promise<{
    success: boolean;
    puntoEnvio?: PuntoEnvio;
    message?: string;
    error?: string;
  }> {
    return this.puntoEnvioService.createPuntoEnvio(data);
  }

  @Patch(':id')
  @Auth(Roles.Admin)
  @Permissions('table:edit')
  update(@Param('id') id: string, @Body() dto: UpdatePuntoEnvioDto) {
    return this.puntoEnvioService.update(id, dto);
  }

  @Delete(':id')
  @Auth(Roles.Admin)
  @Permissions('table:delete')
  remove(@Param('id') id: string) {
    return this.puntoEnvioService.remove(id);
  }
}
