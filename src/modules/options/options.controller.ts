import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { OptionsService } from './options.service';
import { OptionDto } from './dto/option.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { Roles } from '../../common/enums/roles.enum';

@Controller('options')
export class OptionsController {
  constructor(private readonly optionsService: OptionsService) {}

  @Post()
  @Auth(Roles.Admin)
  create(@Body() createOptionDto: OptionDto) {
    return this.optionsService.create(createOptionDto);
  }

  @Get()
  findAll() {
    return this.optionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.optionsService.findOne(id);
  }

  @Patch(':id')
  @Auth(Roles.Admin)
  update(@Param('id') id: string, @Body() updateOptionDto: OptionDto) {
    return this.optionsService.update(id, updateOptionDto);
  }

  @Delete(':id')
  @Auth(Roles.Admin)
  remove(@Param('id') id: string) {
    return this.optionsService.remove(id);
  }
}
