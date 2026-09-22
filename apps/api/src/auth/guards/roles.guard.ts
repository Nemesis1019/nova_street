import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Permission } from '../permissions';

type RequestUser = {
  role?: string;
  permissions?: Permission[];
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const hasRoleRequirement = requiredRoles && requiredRoles.length > 0;
    const hasPermissionRequirement =
      requiredPermissions && requiredPermissions.length > 0;

    if (!hasRoleRequirement && !hasPermissionRequirement) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<Request>();
    const requestUser = user as RequestUser | undefined;
    const role = requestUser?.role ?? '';
    const permissions = requestUser?.permissions ?? [];

    const roleOk = !hasRoleRequirement || requiredRoles.includes(role);

    const permissionsOk =
      !hasPermissionRequirement ||
      role === 'ADMIN' ||
      permissions.some((permission) => requiredPermissions.includes(permission));

    return roleOk && permissionsOk;
  }
}
