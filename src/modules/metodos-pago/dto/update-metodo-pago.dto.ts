import { PartialType } from '@nestjs/mapped-types';
import { CreateMetodoPagoDto } from './create-metodo-pago.dto';

export class UpdateMetodoPagoDto extends PartialType(CreateMetodoPagoDto) { }
