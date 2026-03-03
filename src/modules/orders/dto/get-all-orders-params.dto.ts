import { IsOptional, IsString, IsNumber, IsArray } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class GetAllOrdersParamsDto {
    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @Transform(({ value }) => {
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            } catch (e) {
                return value;
            }
        }
        return value;
    })
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

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    pageSize?: number;
}
