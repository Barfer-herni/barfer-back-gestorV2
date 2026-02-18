import { applyDecorators, UseGuards } from '@nestjs/common';
import { Roles } from '../../../common/enums/roles.enum';
import { AuthGuard } from '../guard/auth.guard';
import { RolesGuard } from '../guard/roles.guard';
import { Role } from './role.decorator';

export function Auth(role: Roles) {
  return applyDecorators(Role(role), UseGuards(AuthGuard, RolesGuard));
}
