import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
  IsMongoId,
} from 'class-validator';
import { Types } from 'mongoose';
import { CouponType } from '../../../common/enums/coupons-types.enum';

export class CreateCouponDto {
  @IsNumber()
  @IsOptional()
  count?: number;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsNumber()
  @IsNotEmpty()
  limit: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(CouponType) // Valida que sea 'fixed' o 'percentage'
  @IsNotEmpty()
  type: CouponType;

  @IsNumber()
  @IsNotEmpty()
  value: number;

  @IsMongoId()
  @IsOptional()
  applicableProductOption?: Types.ObjectId; // ID de la opción de producto específica

  @IsNumber()
  @IsOptional()
  maxAplicableUnits?: number; // Cuántas unidades aplican al descuento
}
