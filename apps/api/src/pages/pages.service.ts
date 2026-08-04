import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';

@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePageDto) {
    return this.prisma.page.create({
      data: {
        slug: dto.slug,
        title: dto.title,
        content: dto.content,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        isVisible: dto.isVisible ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async findAllAdmin() {
    return this.prisma.page.findMany({ orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }] });
  }

  async findVisible() {
    return this.prisma.page.findMany({
      where: { isVisible: true },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    });
  }

  async findBySlug(slug: string) {
    const page = await this.prisma.page.findUnique({ where: { slug } });
    if (!page || !page.isVisible) {
      throw new NotFoundException('Page not found');
    }
    return page;
  }

  async findByIdAdmin(id: string) {
    const page = await this.prisma.page.findUnique({ where: { id } });
    if (!page) {
      throw new NotFoundException('Page not found');
    }
    return page;
  }

  async update(id: string, dto: UpdatePageDto) {
    await this.findByIdAdmin(id);
    return this.prisma.page.update({
      where: { id },
      data: {
        slug: dto.slug,
        title: dto.title,
        content: dto.content,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        isVisible: dto.isVisible,
        sortOrder: dto.sortOrder,
      },
    });
  }

  async remove(id: string) {
    await this.findByIdAdmin(id);
    return this.prisma.page.delete({ where: { id } });
  }
}
