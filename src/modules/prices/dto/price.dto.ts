import {
  IsArray,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsBoolean,
} from 'class-validator';


import { Section, PriceType } from '../../../schemas/prices.schema';

export class PriceDto {

  @IsNotEmpty()
  @IsEnum(Section)
  section: Section;

  @IsNotEmpty()
  @IsString()
  product: string;

  @IsOptional()
  @IsString()
  weight?: string;

  @IsNotEmpty()
  @IsEnum(PriceType)
  priceType: PriceType;

  @IsNotEmpty()
  @IsNumber()
  price: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  effectiveDate?: string;

  @IsOptional()
  validFrom?: string | Date;

}

