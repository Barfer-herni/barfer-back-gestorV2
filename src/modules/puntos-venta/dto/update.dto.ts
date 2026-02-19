import { PartialType } from '@nestjs/mapped-types';
import { CreatePuntoVentaDto } from './punto-venta.dto';

export class UpdatePuntoVentaDto extends PartialType(
    CreatePuntoVentaDto,
) {
    activo?: boolean;
}
