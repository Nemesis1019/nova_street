import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class VerifiedEmailGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { userId: string; emailVerified: boolean } | undefined;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (!user.emailVerified) {
      throw new ForbiddenException('Email not verified');
    }

    return true;
  }
}
