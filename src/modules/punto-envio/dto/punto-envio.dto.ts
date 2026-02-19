import {
  IsArray,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class PuntoEnvioDto {
  @IsNotEmpty()
  @IsString()
  nombre: string

  @IsNotEmpty()
  @IsString()
  cutoffTime: string
}