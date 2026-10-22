import { BadGatewayException, Injectable } from '@nestjs/common';

import { EmailTemplatesService } from './email-templates.service';
import type { EmailMessage } from './providers';
import { EmailProviderResolver } from './providers/email-provider.resolver';
import { escapeHtml } from './templates/render-template';

@Injectable()
export class EmailService {
  constructor(
    private readonly resolver: EmailProviderResolver,
    private readonly templates: EmailTemplatesService,
  ) {}

  async send(options: EmailMessage): Promise<void> {
    const provider = await this.resolver.resolve();
    const sender = await this.resolver.getSender();

    const from = options.from;
    if (!from && sender.address) {
      options.from = sender.name ? `${sender.name} <${sender.address}>` : sender.address;
    }

    await provider.send(options);
  }

  /** Envía una plantilla de prueba con datos de ejemplo al destinatario indicado. */
  async sendTemplateTest(key: string, to: string): Promise<void> {
    const sampleVars = await this.templates.getSampleVarsFor(key);
    const rendered = await this.templates.render(key, sampleVars);
    try {
      await this.send({
        to,
        subject: `[Prueba] ${rendered.subject}`,
        html: rendered.html,
        text: rendered.text,
      });
    } catch (error) {
      throw new BadGatewayException(
        error instanceof Error ? `No se pudo enviar el email de prueba: ${error.message}` : 'Email provider error',
      );
    }
  }

  async sendGenericEmail(email: string, subject: string, body: string): Promise<void> {
    await this.send({
      to: email,
      subject,
      html: `<div>${escapeHtml(body)}</div>`,
      text: body,
    });
  }

  async sendWelcome(email: string, firstName: string): Promise<void> {
    const rendered = await this.templates.render('welcome', { firstName });
    await this.send({ to: email, ...rendered });
  }

  async sendEmailVerification(
    email: string,
    firstName: string,
    verificationUrl: string,
    expirationHours: number,
  ): Promise<void> {
    const rendered = await this.templates.render('email-verification', {
      firstName,
      verificationUrl,
      expirationHours: String(expirationHours),
    });
    await this.send({ to: email, ...rendered });
  }

  async sendPasswordReset(email: string, firstName: string, resetUrl: string, expirationMinutes: number): Promise<void> {
    const rendered = await this.templates.render('password-reset', {
      firstName,
      resetUrl,
      expirationMinutes: String(expirationMinutes),
    });
    await this.send({ to: email, ...rendered });
  }

  async sendNewsletterConfirmation(email: string): Promise<void> {
    const rendered = await this.templates.render('newsletter-confirmation', {});
    await this.send({ to: email, ...rendered });
  }

  async sendOrderCreated(email: string, orderId: string, total: number, currencyCode: string): Promise<void> {
    const rendered = await this.templates.render('order-created', {
      orderNumber: orderId.slice(-6),
      total: total.toLocaleString(),
      currencyCode,
    });
    await this.send({ to: email, ...rendered });
  }

  async sendOrderStatusUpdate(
    email: string,
    orderId: string,
    status: string,
    trackingNumber?: string,
    carrier?: string,
    trackingUrl?: string,
  ): Promise<void> {
    const trackingBlock =
      trackingNumber && carrier
        ? `<p>Número de seguimiento: <strong>${escapeHtml(trackingNumber)}</strong> (${escapeHtml(carrier)})</p>${
            trackingUrl
              ? `<p><a href="${escapeHtml(trackingUrl)}" target="_blank" rel="noopener noreferrer">Rastrear envío</a></p>`
              : ''
          }`
        : '';

    const rendered = await this.templates.render('order-status-update', {
      orderNumber: orderId.slice(-6),
      status,
      trackingBlock,
    });
    await this.send({
      to: email,
      ...rendered,
      text: `${rendered.text}${trackingUrl ? ` Link: ${trackingUrl}.` : ''}`,
    });
  }

  async sendPaymentConfirmed(email: string, orderId: string, total: number, currencyCode: string): Promise<void> {
    const rendered = await this.templates.render('payment-confirmed', {
      orderNumber: orderId.slice(-6),
      total: total.toLocaleString(),
      currencyCode,
    });
    await this.send({ to: email, ...rendered });
  }

  async sendCustomDesignApproved(email: string, firstName: string, templateName: string): Promise<void> {
    const rendered = await this.templates.render('custom-design-approved', { firstName, templateName });
    await this.send({ to: email, ...rendered });
  }

  async sendCustomDesignRejected(
    email: string,
    firstName: string,
    templateName: string,
    reason: string,
  ): Promise<void> {
    const rendered = await this.templates.render('custom-design-rejected', { firstName, templateName, reason });
    await this.send({ to: email, ...rendered });
  }

  async sendProductionStatusUpdate(
    email: string,
    orderId: string,
    itemName: string,
    status: string,
  ): Promise<void> {
    const rendered = await this.templates.render('production-status-update', {
      orderNumber: orderId.slice(-6),
      itemName,
      status,
    });
    await this.send({ to: email, ...rendered });
  }

  async sendShipmentUpdate(
    email: string,
    orderId: string,
    carrier: string,
    trackingNumber: string,
    trackingUrl: string | undefined,
    status: string,
  ): Promise<void> {
    const trackingLink = trackingUrl
      ? `<p><a href="${escapeHtml(trackingUrl)}" target="_blank" rel="noopener noreferrer">Rastrear envío</a></p>`
      : '';

    const rendered = await this.templates.render('shipment-update', {
      orderNumber: orderId.slice(-6),
      carrier,
      trackingNumber,
      trackingLink,
      status,
    });
    await this.send({
      to: email,
      ...rendered,
      text: `${rendered.text}${trackingUrl ? ` Link: ${trackingUrl}.` : ''}`,
    });
  }
}
