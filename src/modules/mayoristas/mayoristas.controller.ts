import {
    Body,
    Controller,
    Get,
    Delete,
    Param,
    Patch,
    Post,
    Query,
    Req,
} from '@nestjs/common';
import { Request } from 'express';
import { PaginationDto } from '../../common/dto/pagination/pagination.dto';
import { Roles } from '../../common/enums/roles.enum';
import { Auth } from '../auth/decorators/auth.decorator';
import { MayoristasService } from './mayoristas.service';

@Controller('mayoristas')
export class MayoristasController {
    constructor(private readonly mayoristasService: MayoristasService) { }



}
