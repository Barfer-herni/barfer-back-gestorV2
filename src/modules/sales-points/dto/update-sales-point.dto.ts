import { PartialType } from '@nestjs/mapped-types';
import { CreateSalesPointDto } from './create-sales-point.dto';

export class UpdateSalesPointDto extends PartialType(CreateSalesPointDto) {}
