import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export enum Registro {
    BLANCO = 'BLANCO',
    NEGRO = 'NEGRO',
}

export class CreateProveedorDto {
    @IsString()
    nombre: string;

    @IsString()
    detalle: string;

    @IsString()
    telefono: string;

    @IsString()
    personaContacto: string;

    @IsEnum(Registro)
    registro: Registro;

    @IsOptional()
    @IsString()
    categoriaId?: string;

    @IsOptional()
    @IsString()
    metodoPagoId?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
