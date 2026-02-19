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
import { PuntoEnvio } from 'src/schemas/punto-envio.schema';

@Controller('puntoEnvio')
export class PuntoEnvioController {
  constructor(private readonly puntoEnvioService: PuntoEnvioService) { }

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
  update(@Param('id') id: string, @Body() dto: UpdatePuntoEnvioDto) {
    return this.puntoEnvioService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.puntoEnvioService.remove(id);

  }
}
