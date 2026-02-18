import { Transform } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { OptionDto } from './option.dto';

export class ProductDto {
  @IsString()
  @IsOptional()
  id?: string;

  @Transform(({ value }) => value.trim())
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsNumber()
  @IsOptional()
  stock?: number;

  @IsString()
  @IsNotEmpty()
  category?: string;

  @IsArray()
  @IsOptional()
  images?: string[];

  @IsArray()
  @IsNotEmpty()
  @IsOptional()
  options?: OptionDto[] = [];

  @IsNumber()
  @IsOptional()
  salesCount?: number;

  @IsNumber()
  @IsOptional()
  discountApplied?: number;

  @IsOptional()
  sameDayDelivery?: boolean;
}
