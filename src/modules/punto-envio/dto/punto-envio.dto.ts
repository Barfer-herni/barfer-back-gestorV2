import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class DayScheduleDto {
  @IsBoolean()
  @IsOptional()
  isOpen?: boolean;

  @IsString()
  @IsOptional()
  cutoffTime?: string;
}

export class WeeklyScheduleDto {
  @ValidateNested()
  @Type(() => DayScheduleDto)
  @IsOptional()
  monday?: DayScheduleDto;

  @ValidateNested()
  @Type(() => DayScheduleDto)
  @IsOptional()
  tuesday?: DayScheduleDto;

  @ValidateNested()
  @Type(() => DayScheduleDto)
  @IsOptional()
  wednesday?: DayScheduleDto;

  @ValidateNested()
  @Type(() => DayScheduleDto)
  @IsOptional()
  thursday?: DayScheduleDto;

  @ValidateNested()
  @Type(() => DayScheduleDto)
  @IsOptional()
  friday?: DayScheduleDto;

  @ValidateNested()
  @Type(() => DayScheduleDto)
  @IsOptional()
  saturday?: DayScheduleDto;

  @ValidateNested()
  @Type(() => DayScheduleDto)
  @IsOptional()
  sunday?: DayScheduleDto;
}

export class DateExceptionDto {
  @IsString()
  @IsNotEmpty()
  date: string;

  @IsBoolean()
  @IsOptional()
  isOpen?: boolean;

  @IsString()
  @IsOptional()
  cutoffTime?: string;
}

export class PuntoEnvioDto {
  @IsNotEmpty()
  @IsString()
  nombre: string;

  @IsOptional()
  @IsString()
  cutoffTime?: string;

  @ValidateNested()
  @Type(() => WeeklyScheduleDto)
  @IsOptional()
  weeklySchedule?: WeeklyScheduleDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DateExceptionDto)
  @IsOptional()
  exceptions?: DateExceptionDto[];
}