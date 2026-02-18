import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { WeekDay } from '../../../schemas/delivery-area.schema';

export class SearchAreaRequestDto {
  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lon?: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsEnum(WeekDay)
  currentDay: WeekDay;
} 