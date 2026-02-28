import { PartialType } from '@nestjs/mapped-types';
import { CreateCategoriaGestorDto } from './create-categoria-gestor.dto';

export class UpdateCategoriaGestorDto extends PartialType(CreateCategoriaGestorDto) { }
