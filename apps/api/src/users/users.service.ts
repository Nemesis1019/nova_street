import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

export type SanitizedUser = Omit<User, 'passwordHash' | 'twoFactorSecret'> & {
  role: { name: string; permissions: string[] };
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });
  }

  async findById(id: string): Promise<SanitizedUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });

    return user ? this.sanitizeUser(user) : null;
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<SanitizedUser> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        // Los campos opcionales vacíos se guardan como null.
        phone: dto.phone === '' ? null : dto.phone,
        document: dto.document === '' ? null : dto.document,
      },
      include: { role: true },
    });

    return this.sanitizeUser(user);
  }

  sanitizeUser(
    user: User & { role: { name: string; permissions: string[] } },
  ): SanitizedUser {
    // Nunca exponer el hash de contraseña, el secreto TOTP (cifrado) ni el
    // vínculo interno con un PlatformUser.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, twoFactorSecret, platformUserId, ...rest } = user;
    return rest as SanitizedUser;
  }
}
