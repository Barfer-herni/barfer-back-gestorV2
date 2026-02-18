import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf
} from 'class-validator';
import { WeekDay } from '../../../schemas/delivery-area.schema';

export class DeliveryAreaDto {
  @IsOptional()
  @IsString()
  description: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  coordinates: number[][];

  @IsOptional()
  @IsString()
  schedule: string;

  @IsOptional()
  @IsNumber()
  orderCutOffHour: number;

  @IsOptional()
  @IsBoolean() 
  sameDayDelivery: boolean;

  @ValidateIf(o => o.sameDayDelivery === true)
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(WeekDay, { each: true })
  sameDayDeliveryDays: WeekDay[];

  @IsOptional()
  whatsappNumber: string;

  @IsOptional()
  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsString()
  sheetName?: string;
}
