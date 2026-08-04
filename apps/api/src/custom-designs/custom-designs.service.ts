import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CustomDesignStatus } from '@prisma/client';

import { CartService } from '../cart/cart.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { CreateCustomDesignDto } from './dto/create-custom-design.dto';
import { UpdateCustomDesignDto } from './dto/update-custom-design.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@Injectable()
export class CustomDesignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly emailService: EmailService,
  ) {}

  async create(userId: string, dto: CreateCustomDesignDto) {
    const template = await this.prisma.designTemplate.findUnique({
      where: { id: dto.designTemplateId },
    });
    if (!template) {
      throw new NotFoundException('Design template not found');
    }

    return this.prisma.customDesign.create({
      data: {
        userId,
        designTemplateId: dto.designTemplateId,
        status: CustomDesignStatus.DRAFT,
        color: dto.color ?? null,
        size: dto.size ?? null,
        surcharge: 0,
      },
      include: { designTemplate: true, elements: true },
    });
  }

  async findOne(userId: string, id: string, isAdmin = false) {
    const design = await this.prisma.customDesign.findUnique({
      where: { id },
      include: { designTemplate: true, elements: { orderBy: { zIndex: 'asc' } } },
    });

    if (!design) {
      throw new NotFoundException('Custom design not found');
    }

    if (!isAdmin && design.userId !== userId) {
      throw new ForbiddenException('You do not own this design');
    }

    return design;
  }

  async findByUser(userId: string) {
    return this.prisma.customDesign.findMany({
      where: { userId },
      include: { designTemplate: true, elements: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(userId: string, id: string, dto: UpdateCustomDesignDto) {
    const design = await this.findOne(userId, id);

    if (design.status !== CustomDesignStatus.DRAFT) {
      throw new BadRequestException('Only draft designs can be edited');
    }

    const { elements, ...data } = dto;

    return this.prisma.$transaction(async (tx) => {
      if (elements) {
        await tx.customDesignElement.deleteMany({ where: { customDesignId: id } });
        if (elements.length > 0) {
          await tx.customDesignElement.createMany({
            data: elements.map((element) => ({
              customDesignId: id,
              type: element.type,
              assetUrl: element.assetUrl ?? null,
              textContent: element.textContent ?? null,
              fontSize: element.fontSize ?? 24,
              fill: element.fill ?? '#0d0d0d',
              positionX: element.positionX,
              positionY: element.positionY,
              scale: element.scale ?? 1,
              rotation: element.rotation ?? 0,
              zIndex: element.zIndex ?? 0,
            })),
          });
        }
      }

      return tx.customDesign.update({
        where: { id },
        data: { ...data, color: data.color ?? undefined, size: data.size ?? undefined },
        include: { designTemplate: true, elements: { orderBy: { zIndex: 'asc' } } },
      });
    });
  }

  async submit(userId: string, id: string) {
    const design = await this.findOne(userId, id);

    if (design.status !== CustomDesignStatus.DRAFT) {
      throw new BadRequestException('Only draft designs can be submitted');
    }

    return this.prisma.customDesign.update({
      where: { id },
      data: { status: CustomDesignStatus.PENDING_REVIEW },
      include: { designTemplate: true, elements: true },
    });
  }

  async addToCart(userId: string, id: string, dto: AddToCartDto) {
    const design = await this.findOne(userId, id);
    const unitPrice = design.designTemplate.basePrice + design.surcharge;

    return this.cartService.addItem(userId, {
      type: 'CUSTOM',
      customDesignId: design.id,
      quantity: dto.quantity,
      unitPrice,
    } as never);
  }

  async updateStatus(id: string, dto: UpdateStatusDto, reviewedById?: string) {
    const design = await this.prisma.customDesign.findUnique({
      where: { id },
      include: { user: { select: { email: true, firstName: true } }, designTemplate: { select: { name: true } } },
    });
    if (!design) {
      throw new NotFoundException('Custom design not found');
    }

    if (dto.status === CustomDesignStatus.REJECTED && !dto.rejectionReason) {
      throw new BadRequestException('Rejection reason is required');
    }

    const isFinalDecision = dto.status === CustomDesignStatus.APPROVED || dto.status === CustomDesignStatus.REJECTED;

    const updated = await this.prisma.customDesign.update({
      where: { id },
      data: {
        status: dto.status,
        rejectionReason: dto.status === CustomDesignStatus.REJECTED ? dto.rejectionReason : null,
        reviewedById: isFinalDecision ? reviewedById : null,
        reviewedAt: isFinalDecision ? new Date() : null,
      },
      include: { designTemplate: true, elements: true, user: { select: { email: true, firstName: true } } },
    });

    if (design.user?.email) {
      if (dto.status === CustomDesignStatus.APPROVED) {
        await this.emailService.sendCustomDesignApproved(
          design.user.email,
          design.user.firstName ?? '',
          design.designTemplate.name,
        );
      } else if (dto.status === CustomDesignStatus.REJECTED && dto.rejectionReason) {
        await this.emailService.sendCustomDesignRejected(
          design.user.email,
          design.user.firstName ?? '',
          design.designTemplate.name,
          dto.rejectionReason,
        );
      }
    }

    return updated;
  }

  async findAllForAdmin(query: { page: number; limit: number; status?: CustomDesignStatus }) {
    const { page = 1, limit = 20, status } = query;
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

    const [data, total] = await Promise.all([
      this.prisma.customDesign.findMany({
        where,
        skip,
        take: limit,
        include: { designTemplate: true, user: { select: { id: true, email: true, firstName: true, lastName: true } }, elements: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customDesign.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }
}
