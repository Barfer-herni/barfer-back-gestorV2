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
import { Section, PriceType } from '../../schemas/prices.schema';
import { TemplatePricesProductsService } from './template_prices_products.service';

@Controller('template-prices-products')
export class TemplatePricesProductsController {
    constructor(private readonly pricesService: TemplatePricesProductsService) { }

}
