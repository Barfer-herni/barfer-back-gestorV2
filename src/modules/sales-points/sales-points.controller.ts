import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { SalesPointsService } from './sales-points.service';
import { CreateSalesPointDto } from './dto/create-sales-point.dto';
import { UpdateSalesPointDto } from './dto/update-sales-point.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { Roles } from '../../common/enums/roles.enum';

@Controller('sales-points')
export class SalesPointsController {
  constructor(private readonly salesPointsService: SalesPointsService) {}

  @Get()
  async findAll() {
    return this.salesPointsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.salesPointsService.findOne(id);
  }

  @Auth(Roles.Admin)
  @Post()
  async create(@Body() createSalesPointDto: CreateSalesPointDto) {
    return this.salesPointsService.create(createSalesPointDto);
  }

  @Auth(Roles.Admin)
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateSalesPointDto: UpdateSalesPointDto) {
    return this.salesPointsService.update(id, updateSalesPointDto);
  }

  @Auth(Roles.Admin)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.salesPointsService.remove(id);
  }
}
