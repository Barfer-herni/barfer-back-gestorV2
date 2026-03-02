import {
  IsString,
  IsBoolean,
  IsEnum,
  IsDate,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  PuntoVentaZona,
  PuntoVentaFrecuencia,
  PuntoVentaTipoNegocio,
} from '../interfaces/punto-venta.interface';

class ContactoDto {
  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  direccion?: string;
}

export class CreatePuntoVentaDto {
  @IsString()
  nombre: string;

  @IsEnum(['CABA', 'LA_PLATA', 'OESTE', 'NOROESTE', 'NORTE', 'SUR'])
  zona: PuntoVentaZona;

  @IsEnum(['SEMANAL', 'QUINCENAL', 'MENSUAL', 'OCASIONAL'])
  frecuencia: PuntoVentaFrecuencia;

  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : new Date(value)))
  @IsDate()
  fechaInicioVentas: Date;

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : new Date(value)))
  @IsDate()
  fechaPrimerPedido?: Date;

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : new Date(value)))
  @IsDate()
  fechaUltimoPedido?: Date;

  @IsBoolean()
  tieneFreezer: boolean;

  @IsOptional()
  @IsNumber()
  cantidadFreezers?: number;

  @IsOptional()
  @IsNumber()
  capacidadFreezer?: number;

  @IsArray()
  @IsEnum(['PET_SHOP', 'VETERINARIA', 'PELUQUERIA'], { each: true })
  tiposNegocio: PuntoVentaTipoNegocio[];

  @IsOptional()
  @IsString()
  horarios?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ContactoDto)
  contacto?: ContactoDto;

  @IsOptional()
  @IsString()
  notas?: string;
}
