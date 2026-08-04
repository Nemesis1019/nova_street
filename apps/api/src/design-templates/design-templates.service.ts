import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DesignTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.designTemplate.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.designTemplate.findUnique({
      where: { id },
    });
    if (!template) {
      throw new NotFoundException('Design template not found');
    }
    return template;
  }
}
