import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateStoreRedirectDto } from './dto/create-store-redirect.dto';
import { UpdateStoreRedirectDto } from './dto/update-store-redirect.dto';

@Injectable()
export class StoreRedirectsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Redirects activos para el middleware del storefront. */
  async findActive() {
    return this.prisma.storeRedirect.findMany({
      where: { isActive: true },
      orderBy: { fromPath: 'asc' },
    });
  }

  async findAll() {
    return this.prisma.storeRedirect.findMany({ orderBy: { fromPath: 'asc' } });
  }

  async create(dto: CreateStoreRedirectDto) {
    return this.prisma.storeRedirect.create({
      data: {
        fromPath: this.normalizePath(dto.fromPath),
        toUrl: dto.toUrl,
        statusCode: dto.statusCode ?? 301,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateStoreRedirectDto) {
    await this.getOrThrow(id);
    return this.prisma.storeRedirect.update({
      where: { id },
      data: {
        ...(dto.fromPath !== undefined ? { fromPath: this.normalizePath(dto.fromPath) } : {}),
        ...(dto.toUrl !== undefined ? { toUrl: dto.toUrl } : {}),
        ...(dto.statusCode !== undefined ? { statusCode: dto.statusCode } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.getOrThrow(id);
    await this.prisma.storeRedirect.delete({ where: { id } });
    return { id, deleted: true };
  }

  private async getOrThrow(id: string) {
    const redirect = await this.prisma.storeRedirect.findUnique({ where: { id } });
    if (!redirect) {
      throw new NotFoundException('Redirect not found');
    }
    return redirect;
  }

  private normalizePath(path: string): string {
    const trimmed = path.trim().toLowerCase();
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  }
}
