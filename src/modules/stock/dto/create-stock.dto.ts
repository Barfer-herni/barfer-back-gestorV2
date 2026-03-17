import { IsNumber, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class CreateStockDto {
    @IsString()
    @IsNotEmpty()
    puntoEnvio: string;

    @IsString()
    @IsNotEmpty()
    producto: string;

    @IsString()
    @IsOptional()
    peso?: string;

    @IsNumber()
    @IsNotEmpty()
    stockInicial: number;

    @IsNumber()
    @IsNotEmpty()
    llevamos: number;

    @IsNumber()
    @IsOptional()
    ajuste?: number;

    @IsNumber()
    @IsNotEmpty()
    pedidosDelDia: number;

    @IsNumber()
    @IsOptional()
    stockFinal?: number;

    @IsString()
    @IsOptional()
    fecha?: string;
}
