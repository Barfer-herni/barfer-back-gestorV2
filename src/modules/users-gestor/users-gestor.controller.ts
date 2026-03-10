import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersGestorService } from './users-gestor.service';
import { CreateUserGestorDto } from './dto/users-gestor.dto';
import { UpdateUserGestorDto } from './dto/update.dto';
import { AuthGuard } from '../auth/guard/auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Role } from '../auth/decorators/role.decorator';
import { Roles } from '../../common/enums/roles.enum';

@Controller('users-gestor')
export class UsersGestorController {
  constructor(private readonly service: UsersGestorService) { }

  @Get()
  @Role(Roles.Admin)
  @UseGuards(AuthGuard, RolesGuard)
  async findAll(@Query('exclude') exclude: string) {
    return this.service.findAll(exclude);
  }

  @Post()
  @Role(Roles.Admin)
  @UseGuards(AuthGuard, RolesGuard)
  async create(@Body() data: CreateUserGestorDto) {
    return this.service.create(data);
  }

  @Get(':id')
  @Role(Roles.Admin)
  @UseGuards(AuthGuard, RolesGuard)
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Role(Roles.Admin)
  @UseGuards(AuthGuard, RolesGuard)
  async update(@Param('id') id: string, @Body() data: UpdateUserGestorDto) {
    return this.service.update(id, data);
  }

  @Delete(':id')
  @Role(Roles.Admin)
  @UseGuards(AuthGuard, RolesGuard)
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post('login')
  async login(@Body() data: { email: string; password: string }) {
    return this.service.login(data.email, data.password);
  }

  @Post('refresh-token')
  async refreshToken(@Body() data: { refresh_token: string }) {
    return this.service.refreshToken(data.refresh_token);
  }

  @Post('verify')
  async verifyCredentials(@Body() data: any) {
    return this.service.verifyCredentials(data.email, data.password);
  }

  @Patch(':id/change-password')
  @UseGuards(AuthGuard)
  async changePassword(
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.service.changePassword(id, data.currentPassword, data.newPassword);
  }
}
