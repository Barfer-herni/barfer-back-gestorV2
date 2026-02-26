import { PartialType } from '@nestjs/mapped-types';
import { PriceDto } from './price.dto';

export class UpdatePriceDto extends PartialType(PriceDto) { }
