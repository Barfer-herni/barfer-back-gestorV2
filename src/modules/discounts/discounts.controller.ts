import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query
} from '@nestjs/common';
import { Roles } from '../../common/enums/roles.enum';
import { Discount } from '../../schemas/discount.schema';
import { Auth } from '../auth/decorators/auth.decorator';
import { DiscountsService } from './discounts.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';

@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Post()
  @Auth(Roles.Admin)
  async create(
    @Body() createDiscountDto: CreateDiscountDto,
  ): Promise<Discount> {
    return this.discountsService.create(createDiscountDto);
  }

  @Get()
  @Auth(Roles.Admin)
  async findAll(): Promise<Discount[]> {
    return this.discountsService.findAll();
  }

  @Get(':id')
  @Auth(Roles.Admin)
  async findById(@Param('id') id: string): Promise<Discount> {
    return this.discountsService.findById(id);
  }

  @Get('active')
  @Auth(Roles.Admin)
  async findActive(): Promise<Discount[]> {
    return this.discountsService.findActive();
  }

  @Get('calculate')
  async calculateDiscount(
    @Query('optionId') optionId: string,
    @Query('quantity') quantity: number,
  ): Promise<{ discount: number }> {
    const discount = await this.discountsService.calculateDiscount(
      optionId,
      quantity,
    );
    return { discount };
  }

  @Post('calculate-cart')
  async calculateCartDiscounts(
    @Body() items: Array<{ optionId: string; quantity: number }>,
  ): Promise<{ totalDiscount: number }> {
    const totalDiscount =
      await this.discountsService.calculateCartDiscounts(items);
    return { totalDiscount };
  }

  @Put(':id')
  @Auth(Roles.Admin)
  async update(
    @Param('id') id: string,
    @Body() updateDiscountDto: UpdateDiscountDto,
  ): Promise<Discount> {
    return this.discountsService.update(id, updateDiscountDto);
  }

  @Delete(':id')
  @Auth(Roles.Admin)
  async remove(@Param('id') id: string): Promise<Discount> {
    return this.discountsService.remove(id);
  }
}
