import { ConflictException, Injectable, Logger } from '@nestjs/common';

import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async subscribe(dto: SubscribeNewsletterDto, _storeName: string) {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const existing = await this.prisma.newsletterSubscriber.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      if (!existing.unsubscribedAt) {
        throw new ConflictException('El email ya está suscrito al newsletter.');
      }

      await this.prisma.newsletterSubscriber.update({
        where: { id: existing.id },
        data: { unsubscribedAt: null, source: dto.source ?? 'website' },
      });
    } else {
      await this.prisma.newsletterSubscriber.create({
        data: {
          email: normalizedEmail,
          source: dto.source ?? 'website',
        },
      });
    }

    try {
      await this.emailService.sendNewsletterConfirmation(normalizedEmail);
    } catch (error) {
      this.logger.error('Newsletter confirmation email failed', error);
    }

    return { email: normalizedEmail, subscribed: true };
  }
}
