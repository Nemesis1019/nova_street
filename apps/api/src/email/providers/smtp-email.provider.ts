import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Transporter } from 'nodemailer';
import * as nodemailer from 'nodemailer';

import type { EmailMessage, EmailProvider } from './email-provider.interface';

export interface SmtpEmailConfig {
  host: string | null;
  port: number;
  user: string | null;
  pass: string | null;
  secure: boolean;
  from: string;
}

/**
 * Proveedor SMTP. La configuración se resuelve por tenant en
 * `EmailProviderResolver`; si el tenant no define credenciales se usan las
 * envs de la plataforma. Los transporters se cachean por configuración.
 */
@Injectable()
export class SmtpEmailProvider implements EmailProvider {
  readonly name = 'smtp';
  private readonly logger = new Logger(SmtpEmailProvider.name);
  private readonly transports = new Map<string, Transporter>();
  private readonly envConfig: SmtpEmailConfig;

  constructor(configService: ConfigService) {
    const port = configService.get<number>('SMTP_PORT') ?? 587;
    this.envConfig = {
      host: configService.get<string>('SMTP_HOST') ?? null,
      port,
      user: configService.get<string>('SMTP_USER') ?? null,
      pass: configService.get<string>('SMTP_PASS') ?? null,
      secure: configService.get<boolean>('SMTP_SECURE') ?? port === 465,
      from: configService.get<string>('SMTP_FROM') ?? 'noreply@tienda.com',
    };

    if (!this.envConfig.host || !this.envConfig.user || !this.envConfig.pass) {
      this.logger.warn('SMTP credentials not configured (platform env). Emails will be logged unless a tenant configures SMTP.');
    }
  }

  async send(message: EmailMessage): Promise<void> {
    return this.sendWithConfig(message, this.envConfig);
  }

  async sendWithConfig(message: EmailMessage, config: SmtpEmailConfig): Promise<void> {
    try {
      const info = await this.getTransporter(config).sendMail({
        from: message.from ?? config.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      this.logger.log(`Email sent to ${message.to} via SMTP: ${info.messageId ?? 'logged'}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${message.to} via SMTP`, error);
      throw error;
    }
  }

  private getTransporter(config: SmtpEmailConfig): Transporter {
    const key = [config.host, config.port, config.secure, config.user, config.pass].join('|');
    const cached = this.transports.get(key);
    if (cached) return cached;

    const transporter =
      config.host && config.user && config.pass
        ? nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: { user: config.user, pass: config.pass },
          })
        : nodemailer.createTransport({ jsonTransport: true });

    this.transports.set(key, transporter);
    return transporter;
  }
}
