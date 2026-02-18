import { Type } from 'class-transformer';
import { IsOptional, IsPositive, Min } from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Min(1)
  page: number;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Min(1)
  limit: number;
}
