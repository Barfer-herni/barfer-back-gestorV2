import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Roles } from '../../common/enums/roles.enum';
import { DeliveryAreasService } from './delivery-areas.service';
import { DeliveryAreaDto } from './dto/delivery-area.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { SearchAreaRequestDto } from './dto/search-area-request.dto';
import { SearchAreaResponseDto } from './dto/search-area-response.dto';

@Controller('delivery-areas')
export class DeliveryAreasController {
  constructor(private readonly deliveryAreasService: DeliveryAreasService) {}

  @Post('/new')
  @Auth(Roles.Admin)
  create(@Body() createDeliveryAreaDto: DeliveryAreaDto) {
    return this.deliveryAreasService.create(createDeliveryAreaDto);
  }

  @Get()
  findAll() {
    return this.deliveryAreasService.findAll();
  }

  @Get('admin')
  @Auth(Roles.Admin)
  findAllAdmin() {
    return this.deliveryAreasService.findAllAdmin();
  }

  @Get(':id')
  findOneById(@Param('id') id: string) {
    return this.deliveryAreasService.findOneById(id);
  }

  @Patch(':id')
  @Auth(Roles.Admin)
  update(
    @Param('id') id: string,
    @Body() updateDeliveryAreaDto: DeliveryAreaDto,
  ) {
    return this.deliveryAreasService.update(id, updateDeliveryAreaDto);
  }

  @Delete(':id')
  @Auth(Roles.Admin)
  remove(@Param('id') id: string) {
    return this.deliveryAreasService.remove(id);
  }

  @Post('/area')
  async searchArea(
    @Body() searchAreaDto: SearchAreaRequestDto,
  ): Promise<SearchAreaResponseDto> {
    const { lat, lon, address, currentDay } = searchAreaDto;

    if (lat !== undefined && lon !== undefined) {
      return this.deliveryAreasService.searchAreaByCoordinates(lat, lon, currentDay);
    } else if (address) {
      return this.deliveryAreasService.searchAreaByAddress(address, currentDay);
    } else {
      throw new BadRequestException(
        'Debe proporcionar latitud y longitud o una dirección.',
      );
    }
  }
}
