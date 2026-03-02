import { PartialType } from '@nestjs/mapped-types';
import { CreatePuntoVentaDto } from './punto-venta.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePuntoVentaDto extends PartialType(CreatePuntoVentaDto) {
    @IsOptional()
    @IsBoolean()
    activo?: boolean;
}
