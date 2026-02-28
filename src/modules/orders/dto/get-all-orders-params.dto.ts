import { IsOptional, IsString, IsNumber, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class GetAllOrdersParamsDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsArray()
    sorting?: { id: string; desc: boolean }[];

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
}
