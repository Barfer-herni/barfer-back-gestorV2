import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { Types } from 'mongoose';

export class UpdateDiscountDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  applicableOptionIds?: Types.ObjectId[];

  @IsNumber()
  @IsOptional()
  initialQuantity?: number;

  @IsNumber()
  @IsOptional()
  initialDiscountAmount?: number;

  @IsNumber()
  @IsOptional()
  additionalDiscountAmount?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
} 