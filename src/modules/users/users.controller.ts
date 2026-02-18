import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { Roles } from '../../common/enums/roles.enum';
import { Auth } from '../auth/decorators/auth.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Get('get-all')
  @Auth(Roles.Admin)
  profile() {
    return this.userService.findAll();
  }

  @Get('byId/:id')
  @Auth(Roles.User)
  getById(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Patch('update/:id')
  @Auth(Roles.User)
  update(@Body() user: UpdateUserDto, @Param('id') id: string) {
    return this.userService.update(id, user);
  }

  @Patch('admin/update/:id')
  @Auth(Roles.Admin)
  updateAdmin(@Body() user: UpdateUserDto, @Param('id') id: string) {
    return this.userService.update(id, user);
  }

  @Get('byEmail/:email')
  @Auth(Roles.User)
  getByEmail(@Param('email') email: string) {
    return this.userService.findOneByEmail(email);
  }

  @Get('admin/byEmail/:email')
  @Auth(Roles.Admin)
  getAdminByEmail(@Param('email') email: string) {
    return this.userService.findOneByEmail(email);
  }
}
