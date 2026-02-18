import {
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
} from 'class-validator';
import { Types } from 'mongoose';
import { CouponType } from '../../../common/enums/coupons-types.enum';

export class UpdateCouponDto {
  @IsString()
  @IsOptional()
  code: string;

  @IsNumber()
  @IsOptional()
  count?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(CouponType) // Valida que sea 'fixed' o 'percentage'
  @IsOptional()
  type?: CouponType;

  @IsNumber()
  @IsOptional()
  value?: number;

  @IsMongoId()
  @IsOptional()
  applicableProductOption?: Types.ObjectId; // ID de la opción de producto específica

  @IsNumber()
  @IsOptional()
  maxAplicableUnits?: number; // Cuántas unidades aplican al descuento
}
