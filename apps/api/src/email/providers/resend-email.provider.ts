import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { EmailMessage, EmailProvider } from './email-provider.interface';

@Injectable()
export class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend';
  private readonly logger = new Logger(ResendEmailProvider.name);
  private readonly apiKey?: string;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.from = this.configService.get<string>('RESEND_FROM') ?? this.configService.get<string>('SMTP_FROM') ?? 'onboarding@resend.dev';

    if (!this.apiKey) {
      this.logger.warn('RESEND_API_KEY not configured. Emails will be logged but not sent.');
    }
  }

  async send(message: EmailMessage): Promise<void> {
    if (!this.apiKey) {
      this.logger.log(`[Resend logged] To: ${message.to}, Subject: ${message.subject}`);
      return;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: message.from ?? this.from,
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
