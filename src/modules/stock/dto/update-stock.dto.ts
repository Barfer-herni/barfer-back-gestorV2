import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateStockDto {
    @IsString()
    @IsOptional()
    puntoEnvio?: string;

    @IsString()
    @IsOptional()
    producto?: string;

    @IsString()
    @IsOptional()
    peso?: string;

    @IsNumber()
    @IsOptional()
    stockInicial?: number;

    @IsNumber()
    @IsOptional()
    llevamos?: number;

    @IsNumber()
    @IsOptional()
    ajuste?: number;

    @IsNumber()
    @IsOptional()
    pedidosDelDia?: number;

    @IsNumber()
    @IsOptional()
    stockFinal?: number;

    @IsString()
    @IsOptional()
    fecha?: string;
}
