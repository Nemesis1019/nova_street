import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../prisma/prisma.service';
import { decryptSecret } from '../../tenant/crypto.util';
import { getCurrentTenantSlug } from '../../tenant/tenant-runtime';
import type { EmailProvider } from './email-provider.interface';
import { ResendEmailProvider } from './resend-email.provider';
import { SmtpEmailProvider } from './smtp-email.provider';

const CACHE_TTL_MS = 60_000;

export interface EmailSenderConfig {
  name?: string;
  address?: string;
}

interface EmailConfigRow {
  emailProvider: string | null;
  emailSenderName: string | null;
  emailSenderAddress: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPass: string | null;
  smtpSecure: boolean | null;
  smtpFrom: string | null;
  resendApiKey: string | null;
  resendFrom: string | null;
}

/**
 * Resuelve el proveedor de email y sus credenciales en cada envío, leyendo
 * `StoreConfig` (con caché de 60s **por tenant**) y cayendo a las envs de la
 * plataforma. Cada cliente puede tener su propio SMTP/Resend sin reiniciar.
 */
@Injectable()
export class EmailProviderResolver {
  private readonly logger = new Logger(EmailProviderResolver.name);
  private readonly cache = new Map<string, { row: EmailConfigRow; at: number }>();
  private readonly boundProviders = new Map<
    string,
    { signature: string; provider: EmailProvider }
  >();

  constructor(
    private readonly smtp: SmtpEmailProvider,
    private readonly resend: ResendEmailProvider,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async resolve(): Promise<EmailProvider> {
    const row = await this.getStoreConfig();
    const tenantKey = getCurrentTenantSlug() ?? 'default';
    const signature = JSON.stringify(row);

    const cached = this.boundProviders.get(tenantKey);
    if (cached && cached.signature === signature) {
      return cached.provider;
    }

    const providerName = (row.emailProvider ?? 'smtp').toLowerCase();
    const provider: EmailProvider =
      providerName === 'resend'
        ? {
            name: 'resend',
            send: (message) =>
              this.resend.sendWithConfig(message, {
                apiKey: row.resendApiKey ? decryptSecret(row.resendApiKey) : this.env('RESEND_API_KEY'),
                from:
                  row.resendFrom ??
                  row.emailSenderAddress ??
                  this.env('RESEND_FROM') ??
                  this.env('SMTP_FROM') ??
                  'onboarding@resend.dev',
              }),
          }
        : this.buildSmtpProvider(row);

    this.boundProviders.set(tenantKey, { signature, provider });
    return provider;
  }

  /** Nombre y dirección configurados en StoreConfig para el `from` de los emails. */
  async getSender(): Promise<EmailSenderConfig> {
    const row = await this.getStoreConfig();
    return {
      name: row.emailSenderName ?? undefined,
      address: row.emailSenderAddress ?? undefined,
    };
  }

  private buildSmtpProvider(row: EmailConfigRow): EmailProvider {
    const envPort = Number(this.env('SMTP_PORT') ?? 587);
    const port = row.smtpPort ?? envPort;

    return {
      name: 'smtp',
      send: (message) =>
        this.smtp.sendWithConfig(message, {
          host: row.smtpHost ?? this.env('SMTP_HOST'),
          port,
          user: row.smtpUser ?? this.env('SMTP_USER'),
          pass: row.smtpPass ? decryptSecret(row.smtpPass) : this.env('SMTP_PASS'),
          secure: row.smtpSecure ?? port === 465,
          from: row.smtpFrom ?? row.emailSenderAddress ?? this.env('SMTP_FROM') ?? 'noreply@tienda.com',
        }),
    };
  }

  private env(key: string): string | null {
    return this.configService.get<string>(key) ?? null;
  }

  private async getStoreConfig(): Promise<EmailConfigRow> {
    const tenantKey = getCurrentTenantSlug() ?? 'default';
    const cached = this.cache.get(tenantKey);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return cached.row;
    }

    let row: EmailConfigRow = {
      emailProvider: this.env('EMAIL_PROVIDER') ?? 'smtp',
      emailSenderName: null,
      emailSenderAddress: null,
      smtpHost: null,
      smtpPort: null,
      smtpUser: null,
      smtpPass: null,
      smtpSecure: null,
      smtpFrom: null,
      resendApiKey: null,
      resendFrom: null,
    };
    try {
      const config = await this.prisma.storeConfig.findFirst({ where: { isActive: true } });
      if (config) {
        row = {
          emailProvider: config.emailProvider ?? row.emailProvider,
          emailSenderName: config.emailSenderName ?? null,
          emailSenderAddress: config.emailSenderAddress ?? null,
          smtpHost: config.smtpHost ?? null,
          smtpPort: config.smtpPort ?? null,
          smtpUser: config.smtpUser ?? null,
          smtpPass: config.smtpPass ?? null,
          smtpSecure: config.smtpSecure ?? null,
          smtpFrom: config.smtpFrom ?? null,
          resendApiKey: config.resendApiKey ?? null,
          resendFrom: config.resendFrom ?? null,
        };
      }
    } catch (error) {
      this.logger.warn(`Could not read StoreConfig for email provider, using env fallback: ${String(error)}`);
    }

    this.cache.set(tenantKey, { row, at: Date.now() });
    return row;
  }
}
