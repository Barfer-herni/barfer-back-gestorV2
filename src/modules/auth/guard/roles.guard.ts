import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY as ROLE_KEY, Roles } from '../../../common/enums/roles.enum';
import { ROLES_KEY } from '../decorators/role.decorator';

const ROLE_HIERARCHY: Record<string, number> = {
  'super-admin': 3,
  'admin': 2,
  'user': 1,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRole = this.reflector.getAllAndOverride<Roles>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRole) return true;

    const { user } = context.switchToHttp().getRequest();
    const userRole = user.role || ROLE_KEY[user.role];

    const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
    const userLevel = ROLE_HIERARCHY[userRole] || 0;

    const result = userLevel >= requiredLevel;
    return result;
  }
}
