import { IsString, IsOptional, IsBoolean, IsNotEmpty } from 'class-validator';

export class CreateMetodoPagoDto {
    @IsString()
    @IsNotEmpty()
    nombre: string;

    @IsString()
    @IsOptional()
    descripcion?: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
