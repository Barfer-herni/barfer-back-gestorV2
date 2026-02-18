import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateSalesPointDto {
  @Transform(({ value }) => value.trim())
  @IsString()
  @IsNotEmpty()
  name: string;

  @Transform(({ value }) => value.trim())
  @IsString()
  @IsNotEmpty()
  address: string;

  @Transform(({ value }) => value.trim())
  @IsString()
  @IsNotEmpty()
  contact: string;

  @Transform(({ value }) => value.trim())
  @IsString()
  @IsOptional()
  ig?: string;

  @Transform(({ value }) => value.trim())
  @IsString()
  @IsNotEmpty()
  region: string;

  @Transform(({ value }) => value.trim())
  @IsString()
  @IsOptional()
  hours?: string;

  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @IsNumber()
  @IsNotEmpty()
  longitude: number;
}
