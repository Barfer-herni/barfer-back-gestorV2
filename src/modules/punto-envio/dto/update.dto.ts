import { IsString, IsOptional } from 'class-validator';

export class UpdatePuntoEnvioDto {
    @IsString()
    @IsOptional()
    nombre?: string;

    @IsString()
    @IsOptional()
    cutoffTime?: string;
}