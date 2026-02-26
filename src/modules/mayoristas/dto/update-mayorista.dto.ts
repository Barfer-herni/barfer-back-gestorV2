import { PartialType } from '@nestjs/mapped-types';
import { CreateMayoristaDto } from './create-mayorista.dto';

export class UpdateMayoristaDto extends PartialType(CreateMayoristaDto) { }
