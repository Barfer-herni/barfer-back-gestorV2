import { Transform } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { CreateCategoryDto } from '../../../modules/categories/dto/create-category.dto';
import { OptionResponseDto } from '../../../modules/options/dto/option-response.dto';

export interface DiscountInfo {
  id: string;
  description: string;
  initialQuantity: number;
  initialDiscountAmount: number;
  additionalDiscountAmount: number;
  applicableOptionIds: string[];
}

export class ProductResponseDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @Transform(({ value }) => value.trim())
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsNumber()
  @IsOptional()
  stock?: number;

  @IsArray()
  @IsNotEmpty()
  category: CreateCategoryDto;

  @IsArray()
  @IsNotEmpty()
  images?: string[];

  @IsArray()
  @IsNotEmpty()
  @IsOptional()
  options?: (OptionResponseDto & { discount?: DiscountInfo })[] = [];

  @IsNumber()
  @IsOptional()
  salesCount?: number;

  @IsOptional()
  sameDayDelivery?: boolean;
}
