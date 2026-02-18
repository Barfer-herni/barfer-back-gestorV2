import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Types } from 'mongoose';

export class CreateDiscountDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsArray()
  @IsNotEmpty()
  applicableOptionIds: Types.ObjectId[];

  @IsNumber()
  @IsNotEmpty()
  initialQuantity: number;

  @IsNumber()
  @IsNotEmpty()
  initialDiscountAmount: number;

  @IsNumber()
  @IsNotEmpty()
  additionalDiscountAmount: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
} 