import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { ResendEmailProvider, SmtpEmailProvider } from './providers';
import { EMAIL_PROVIDER } from './providers/email-provider.token';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [
    EmailService,
    SmtpEmailProvider,
    ResendEmailProvider,
    {
      provide: EMAIL_PROVIDER,
      inject: [SmtpEmailProvider, ResendEmailProvider, PrismaService],
      useFactory: async (
        smtp: SmtpEmailProvider,
        resend: ResendEmailProvider,
        prisma: PrismaService,
      ) => {
        const config = await prisma.storeConfig.findFirst({ where: { isActive: true } });
        const providerName = (config?.emailProvider ?? process.env.EMAIL_PROVIDER ?? 'smtp').toLowerCase();
        switch (providerName) {
          case 'resend':
            return resend;
          case 'smtp':
          default:
            return smtp;
        }
      },
    },
  ],
  exports: [EmailService],
})
export class EmailModule {}
