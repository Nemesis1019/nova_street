import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { UsersService } from '../../users/users.service';
import { Permission } from '../permissions';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  permissions?: Permission[];
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
  permissions: Permission[];
  emailVerified: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.usersService.findById(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    const allPermissions = new Set([
      ...(user.role.permissions ?? []),
      ...(user.permissions ?? []),
    ]);

    return {
      userId: payload.sub,
      email: payload.email,
      role: user.role.name,
      permissions: Array.from(allPermissions) as Permission[],
      emailVerified: user.emailVerified,
    };
  }
}
