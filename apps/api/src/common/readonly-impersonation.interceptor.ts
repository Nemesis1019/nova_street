import {
  type CallHandler,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';

/**
 * Bloquea mutaciones en una sesión de impersonación de solo lectura.
 * Corre después de los guards, por lo que `req.user` ya está disponible.
 */
@Injectable()
export class ReadOnlyImpersonationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const req = context.switchToHttp().getRequest<Request & { user?: { readOnly?: boolean } }>();
    const method = req.method.toUpperCase();
    if (req.user?.readOnly && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      throw new ForbiddenException(
        'Sesión de impersonación de solo lectura: no se permiten cambios',
      );
    }

    return next.handle();
  }
}
