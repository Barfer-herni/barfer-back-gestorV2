import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredPermissions) {
            return true; // No permissions required
        }

        const { user } = context.switchToHttp().getRequest();

        // Require the user to exist (should be handled by AuthGuard, but safe to check)
        if (!user) {
            return false;
        }

        // Admins have access to everything (or we can require explicit permissions even for admins)
        // Based on standard PBAC, we'll check specific permissions, but allow a super-admin bypass if needed.
        // For now, let's strictly check permissions as configured in PBAC.
        if (user.role === 'admin') {
            // Many systems let 'admin' bypass PBAC, but your model explicitly gives 'admin' an array of permissions.
            // It's cleaner to just check the permissions array regardless of role if we use @Permissions.
            // However, if an admin MUST always have access, we could uncomment:
            // return true; 
        }

        const userPermissions = user.permissions || [];
        const hasPermission = () => requiredPermissions.some((permission) => userPermissions.includes(permission));


        if (!hasPermission()) {
            throw new ForbiddenException('No tienes los permisos necesarios para realizar esta acción');
        }

        return true;
    }
}
