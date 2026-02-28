import { IsOptional, IsString, IsNumber, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class GetAllOrdersParamsDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    sorting?: any;

    @IsOptional()
    @IsString()
    from?: string;

    @IsOptional()
    @IsString()
    to?: string;

    @IsOptional()
    @IsString()
    orderType?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    limit?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    pageIndex?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    pageSize?: number;
}
