import { IsString, IsArray, IsOptional } from 'class-validator';

export class UpdateUserGestorDto {
    @IsString()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    lastName?: string;

    @IsString()
    @IsOptional()
    role?: string;

    @IsString()
    @IsOptional()
    password?: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    permissions?: string[];

    @IsOptional()
    puntoEnvio?: string | string[];
}
