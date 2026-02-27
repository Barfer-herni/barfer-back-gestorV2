import { IsArray, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CalculateSalesProductDto {
    @IsString()
    @IsNotEmpty()
    product: string;

    @IsString()
    @IsNotEmpty()
    section: string;

    @IsString()
    @IsOptional()
    weight?: string;
}

export class CalculateSalesDto {
    @IsObject()
    @IsNotEmpty()
    product: CalculateSalesProductDto;

    @IsArray()
    @IsNotEmpty()
    orders: any[];
}
