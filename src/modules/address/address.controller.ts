import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { Auth } from '../auth/decorators/auth.decorator';
import { Roles } from '../../common/enums/roles.enum';
import { AddressDto } from './dto/address.dto';
import { AddressService } from './address.service';

@Controller('address')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post()
  @Auth(Roles.User)
  create(@Body() createAddressDto: AddressDto) {
    return this.addressService.create(createAddressDto);
  }

  @Get()
  @Auth(Roles.Admin)
  findAll() {
    return this.addressService.findAll();
  }

  @Get(':id')
  @Auth(Roles.User)
  findOne(@Param('id') id: string) {
    return this.addressService.findOneById(id);
  }

  @Put(':id')
  @Auth(Roles.User)
  update(@Param('id') id: string, @Body() updateAddressDto: AddressDto) {
    return this.addressService.update(id, updateAddressDto);
  }

  @Get('user/:id')
  @Auth(Roles.User)
  findManyByUserId(@Param('id') id: string) {
    return this.addressService.findManyByUserId(id);
  }

  @Delete(':id')
  @Auth(Roles.User)
  @Auth(Roles.Admin)
  remove(@Param('id') id: string) {
    return this.addressService.remove(id);
  }
}
