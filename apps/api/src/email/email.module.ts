import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from '../prisma/prisma.module';
import { EmailService } from './email.service';
import { EmailTemplatesController } from './email-templates.controller';
import { EmailTemplatesService } from './email-templates.service';
import { ResendEmailProvider, SmtpEmailProvider } from './providers';
import { EmailProviderResolver } from './providers/email-provider.resolver';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [EmailTemplatesController],
  providers: [EmailService, EmailTemplatesService, SmtpEmailProvider, ResendEmailProvider, EmailProviderResolver],
  exports: [EmailService, EmailTemplatesService],
})
export class EmailModule {}
