import {
    IsArray,
    IsDate,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
} from 'class-validator';


export class BalanceMonthlyDataDto {
    @IsString()
    @IsNotEmpty()
    mes: string;

    @IsNumber()
    @IsNotEmpty()
    entradasMinorista: number;

    @IsNumber()
    @IsNotEmpty()
    entradasMinoristaPorcentaje: number;

    @IsNumber()
    @IsNotEmpty()
    cantVentasMinorista: number;

    @IsNumber()
    @IsNotEmpty()
    cantVentasMinoristaPorcentaje: number;

    @IsNumber()
    @IsNotEmpty()
    entradasMayorista: number;

    @IsNumber()
    @IsNotEmpty()
    entradasMayoristaPorcentaje: number;

    @IsNumber()
    @IsNotEmpty()
    cantVentasMayorista: number;

    @IsNumber()
    @IsNotEmpty()
    cantVentasMayoristaPorcentaje: number;

    @IsNumber()
    @IsNotEmpty()
    entradasExpress: number;

    @IsNumber()
    @IsNotEmpty()
    entradasExpressPorcentaje: number;

    @IsNumber()
    @IsNotEmpty()
    cantVentasExpress: number;

    @IsNumber()
    @IsNotEmpty()
    cantVentasExpressPorcentaje: number;

    @IsNumber()
    @IsNotEmpty()
    entradasTotales: number;

    @IsNumber()
    @IsNotEmpty()
    salidas: number;

    @IsNumber()
    @IsNotEmpty()
    salidasPorcentaje: number;

    @IsNumber()
    @IsNotEmpty()
    gastosOrdinariosBarfer: number;

    @IsNumber()
    @IsNotEmpty()
    gastosOrdinariosSLR: number;

    @IsNumber()
    @IsNotEmpty()
    gastosOrdinariosTotal: number;

    @IsNumber()
    @IsNotEmpty()
    gastosExtraordinariosBarfer: number;

    @IsNumber()
    @IsNotEmpty()
    gastosExtraordinariosSLR: number;

    @IsNumber()
    @IsNotEmpty()
    gastosExtraordinariosTotal: number;

    @IsNumber()
    @IsNotEmpty()
    resultadoSinExtraordinarios: number;

    @IsNumber()
    @IsNotEmpty()
    resultadoConExtraordinarios: number;

    @IsNumber()
    @IsNotEmpty()
    porcentajeSinExtraordinarios: number;

    @IsNumber()
    @IsNotEmpty()
    porcentajeConExtraordinarios: number;

    @IsNumber()
    @IsNotEmpty()
    precioPorKg: number;
}

import { Type } from 'class-transformer';

export class BalanceMonthlyParamsDto {
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    startDate?: Date;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    endDate?: Date;
}

