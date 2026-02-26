import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export enum Tipo {
    ORDINARIO = 'ORDINARIO',
    EXTRAORDINARIO = 'EXTRAORDINARIO',
}

export enum TipoRegistro {
    BLANCO = 'BLANCO',
    NEGRO = 'NEGRO',
}

export class CreateSalidaDto {
    @IsDateString()
    fechaFactura: string;

    @IsString()
    detalle: string;

    @IsString()
    categoriaId: string;

    @IsEnum(Tipo)
    tipo: Tipo;

    @IsOptional()
    @IsString()
    marca?: string;

    @IsNumber()
    monto: number;

    @IsString()
    metodoPagoId: string;

    @IsEnum(TipoRegistro)
    tipoRegistro: TipoRegistro;

    @IsOptional()
    @IsString()
    proveedorId?: string;

    @IsOptional()
    @IsDateString()
    fechaPago?: string;

    @IsOptional()
    @IsString()
    comprobanteNumber?: string;
}
