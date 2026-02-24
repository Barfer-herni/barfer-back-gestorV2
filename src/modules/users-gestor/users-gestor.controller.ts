import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { UsersGestorService } from './users-gestor.service';
import { CreateUserGestorDto } from './dto/users-gestor.dto';
import { UpdateUserGestorDto } from './dto/update.dto';

@Controller('users-gestor')
export class UsersGestorController {
  constructor(private readonly service: UsersGestorService) { }

  @Post()
  async create(@Body() data: CreateUserGestorDto) {
    return this.service.create(data);
  }

  @Get()
  async findAll(@Query('exclude') exclude: string) {
    return this.service.findAll(exclude);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: UpdateUserGestorDto) {
    return this.service.update(id, data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post('verify')
  async verifyCredentials(@Body() data: any) {
    return this.service.verifyCredentials(data.email, data.password);
  }

  @Patch(':id/change-password')
  async changePassword(
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.service.changePassword(id, data.currentPassword, data.newPassword);
  }
}
