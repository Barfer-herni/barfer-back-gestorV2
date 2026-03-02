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
import { PricesService } from './prices.service';
import { PriceDto } from './dto/price.dto';
import { UpdatePriceDto } from './dto/update.dto';
import { Section, PriceType } from '../../schemas/prices.schema';

@Controller('prices')
export class PricesController {
  constructor(private readonly pricesService: PricesService) { }

  @Post()
  // @Auth(Roles.Admin)
  create(@Body() data: PriceDto) {
    return this.pricesService.createPrice(data);
  }

  @Get()
  // @Auth(Roles.User)
  getAll(@Query() query: any) {
    if (Object.keys(query).length > 0) {
      return this.pricesService.getPrices(query);
    }
    return this.pricesService.getAllPrices();
  }

  @Get('current')
  // @Auth(Roles.User)
  getCurrent() {
    return this.pricesService.getCurrentPrices();
  }

  @Get('unique-products')
  // @Auth(Roles.User)
  getUniqueProducts() {
    return this.pricesService.getAllUniqueProducts();
  }

  @Get('select')
  // @Auth(Roles.User)
  getForSelect() {
    return this.pricesService.getProductsForSelect();
  }

  @Get('history')
  // @Auth(Roles.User)
  getHistory(
    @Query('section') section: Section,
    @Query('product') product: string,
    @Query('weight') weight: string,
    @Query('priceType') priceType: PriceType
  ) {
    return this.pricesService.getPriceHistory(section, product, weight, priceType);
  }

  @Get('stats')
  // @Auth(Roles.Admin)
  getStats() {
    return this.pricesService.getPriceStats();
  }

  @Patch('product')
  // @Auth(Roles.Admin)
  updateProduct(
    @Query('section') section: Section,
    @Query('product') product: string,
    @Query('weight') weight: string,
    @Body() data: { section?: Section; product?: string; weight?: string | null }
  ) {
    return this.pricesService.updateProductPrices(
      section,
      product,
      weight === 'null' ? null : weight,
      data
    );
  }

  @Patch(':id')
  // @Auth(Roles.Admin)
  update(@Param('id') id: string, @Body() data: UpdatePriceDto) {
    return this.pricesService.updatePrice(id, data);
  }

  @Patch('product/price-types')
  // @Auth(Roles.Admin)
  updatePriceTypes(
    @Body() data: {
      section: Section;
      product: string;
      weight: string | null;
      oldPriceTypes: PriceType[];
      newPriceTypes: PriceType[];
    }
  ) {
    return this.pricesService.updateProductPriceTypes(
      data.section,
      data.product,
      data.weight,
      data.oldPriceTypes,
      data.newPriceTypes
    );
  }

  @Delete('product')
  // @Auth(Roles.Admin)
  deleteProduct(
    @Query('section') section: Section,
    @Query('product') product: string,
    @Query('weight') weight: string
  ) {
    return this.pricesService.deleteProductPrices(section, product, weight === 'null' ? null : weight);
  }

  @Delete(':id')
  // @Auth(Roles.Admin)
  delete(@Param('id') id: string) {
    return this.pricesService.deletePrice(id);
  }

  @Post('initialize-period')
  // @Auth(Roles.Admin)
  initializePeriod(@Body() data: { month: number; year: number }) {
    return this.pricesService.initializePricesForPeriod(data.month, data.year);
  }

}
