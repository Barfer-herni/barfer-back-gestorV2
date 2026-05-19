import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { WeeklyScheduleDto, DateExceptionDto } from './punto-envio.dto';

export class UpdatePuntoEnvioDto {
    @IsString()
    @IsOptional()
    nombre?: string;

    @IsString()
    @IsOptional()
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