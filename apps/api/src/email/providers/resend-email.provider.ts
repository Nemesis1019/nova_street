import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { EmailMessage, EmailProvider } from './email-provider.interface';

export interface ResendEmailConfig {
  apiKey: string | null;
  from: string;
}

/**
 * Proveedor Resend. La API key se resuelve por tenant (StoreConfig) con
 * fallback a `RESEND_API_KEY`.
 */
@Injectable()
export class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend';
  private readonly logger = new Logger(ResendEmailProvider.name);
  private readonly envConfig: ResendEmailConfig;

  constructor(configService: ConfigService) {
    this.envConfig = {
      apiKey: configService.get<string>('RESEND_API_KEY') ?? null,
      from:
        configService.get<string>('RESEND_FROM') ??
        configService.get<string>('SMTP_FROM') ??
        'onboarding@resend.dev',
    };

    if (!this.envConfig.apiKey) {
      this.logger.warn('RESEND_API_KEY not configured (platform env). Emails will be logged unless a tenant configures Resend.');
    }
  }

  async send(message: EmailMessage): Promise<void> {
    return this.sendWithConfig(message, this.envConfig);
  }

  async sendWithConfig(message: EmailMessage, config: ResendEmailConfig): Promise<void> {
    if (!config.apiKey) {
      this.logger.log(`[Resend logged] To: ${message.to}, Subject: ${message.subject}`);
      return;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: message.from ?? config.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => 'Unknown error');
      this.logger.error(`Resend API error (${response.status}): ${body}`);
      throw new Error(`Resend API error: ${response.status}`);
    }

    const data = (await response.json()) as { id?: string };
    this.logger.log(`Email sent to ${message.to} via Resend: ${data.id ?? 'ok'}`);
  }
}
