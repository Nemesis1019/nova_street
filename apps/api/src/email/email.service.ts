import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { EmailMessage, EmailProvider } from './providers';
import { EMAIL_PROVIDER } from './providers/email-provider.token';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly storeName: string;

  constructor(
    private readonly configService: ConfigService,
    @Inject(EMAIL_PROVIDER) private readonly provider: EmailProvider,
  ) {
    this.storeName = this.configService.get<string>('STORE_NAME') ?? 'NÖVA';
  }

  async send(options: EmailMessage): Promise<void> {
    await this.provider.send(options);
  }

  async sendGenericEmail(email: string, subject: string, body: string): Promise<void> {
    await this.send({
      to: email,
      subject,
      html: this.wrapTemplate(`<div>${this.escapeHtml(body)}</div>`),
      text: body,
    });
  }

  async sendWelcome(email: string, firstName: string): Promise<void> {
    await this.send({
      to: email,
      subject: `Bienvenido a ${this.storeName}`,
      html: this.wrapTemplate(`
        <h2>Hola, ${this.escapeHtml(firstName)}</h2>
        <p>Tu cuenta en <strong>${this.storeName}</strong> fue creada exitosamente.</p>
        <p>Ya podés explorar el catálogo, guardar direcciones y seguir tus pedidos.</p>
        <a href="#" style="display:inline-block;padding:16px 24px;background:#0d0d0d;color:#fcf9f8;text-decoration:none;text-transform:uppercase;letter-spacing:0.05em;">Explorar ahora</a>
      `),
      text: `Hola ${firstName}, tu cuenta en ${this.storeName} fue creada. Ya podés explorar el catálogo.`,
    });
  }

  async sendEmailVerification(email: string, firstName: string, code: string): Promise<void> {
    await this.send({
      to: email,
      subject: `Verificá tu email — ${this.storeName}`,
      html: this.wrapTemplate(`
        <h2>Hola, ${this.escapeHtml(firstName)}</h2>
        <p>Usá el siguiente código para verificar tu email:</p>
        <div style="padding:24px;background:#f6f3f2;border:1px solid #0d0d0d;text-align:center;font-family:'Courier New',monospace;font-size:32px;letter-spacing:0.1em;">${code}</div>
        <p>El código expira en 15 minutos.</p>
        <p style="font-size:12px;color:#747878;">Si no solicitaste este código, ignorá este mensaje.</p>
      `),
      text: `Hola ${firstName}, tu código de verificación es ${code}. Expira en 15 minutos.`,
    });
  }

  async sendNewsletterConfirmation(email: string): Promise<void> {
    await this.send({
      to: email,
      subject: `Bienvenido al newsletter de ${this.storeName}`,
      html: this.wrapTemplate(`
        <h2>Gracias por suscribirte</h2>
        <p>Recibirás primicias sobre drops exclusivos, colaboraciones y lanzamientos de ${this.storeName}.</p>
        <p style="font-size:12px;color:#747878;">Si no solicitaste esta suscripción, podés ignorar este mensaje.</p>
      `),
      text: `Gracias por suscribirte al newsletter de ${this.storeName}. Recibirás primicias sobre drops exclusivos.`,
    });
  }

  async sendOrderCreated(email: string, orderId: string, total: number, currencyCode: string): Promise<void> {
    await this.send({
      to: email,
      subject: `Orden recibida — #${orderId.slice(-6)}`,
      html: this.wrapTemplate(`
        <h2>Tu orden fue recibida</h2>
        <p>Número de orden: <strong>#${orderId.slice(-6)}</strong></p>
        <p>Total: <strong>${currencyCode} ${total.toLocaleString()}</strong></p>
        <p>Te avisaremos cuando el pago sea confirmado y la orden pase a producción.</p>
      `),
      text: `Tu orden #${orderId.slice(-6)} fue recibida. Total: ${currencyCode} ${total}.`,
    });
  }

  async sendOrderStatusUpdate(
    email: string,
    orderId: string,
    status: string,
    trackingNumber?: string,
    carrier?: string,
    trackingUrl?: string,
  ): Promise<void> {
    const trackingHtml =
      trackingNumber && carrier
        ? `<p>Número de seguimiento: <strong>${this.escapeHtml(trackingNumber)}</strong> (${this.escapeHtml(carrier)})</p>${trackingUrl ? `<p><a href="${this.escapeHtml(trackingUrl)}" target="_blank" rel="noopener noreferrer">Rastrear envío</a></p>` : ''}`
        : '';

    await this.send({
      to: email,
      subject: `Actualización de tu orden — #${orderId.slice(-6)}`,
      html: this.wrapTemplate(`
        <h2>Tu orden cambió de estado</h2>
        <p>Número de orden: <strong>#${orderId.slice(-6)}</strong></p>
        <p>Estado actual: <strong>${this.escapeHtml(status)}</strong></p>
        ${trackingHtml}
        <p>Podés ver el detalle en tu cuenta.</p>
      `),
      text: `Tu orden #${orderId.slice(-6)} ahora está en estado ${status}.${trackingUrl ? ` Link: ${trackingUrl}.` : ''}`,
    });
  }

  async sendPaymentConfirmed(email: string, orderId: string, total: number, currencyCode: string): Promise<void> {
    await this.send({
      to: email,
      subject: `Pago confirmado — #${orderId.slice(-6)}`,
      html: this.wrapTemplate(`
        <h2>Pago confirmado</h2>
        <p>Número de orden: <strong>#${orderId.slice(-6)}</strong></p>
        <p>Total: <strong>${currencyCode} ${total.toLocaleString()}</strong></p>
        <p>Tu orden ya está en preparación.</p>
      `),
      text: `Pago confirmado para orden #${orderId.slice(-6)}. Total: ${currencyCode} ${total}.`,
    });
  }

  async sendCustomDesignApproved(email: string, firstName: string, templateName: string): Promise<void> {
    await this.send({
      to: email,
      subject: `Tu diseño fue aprobado — ${this.storeName}`,
      html: this.wrapTemplate(`
        <h2>Hola, ${this.escapeHtml(firstName)}</h2>
        <p>Tu diseño personalizado basado en <strong>${this.escapeHtml(templateName)}</strong> fue aprobado.</p>
        <p>Ya podés agregarlo al carrito y continuar con la compra.</p>
        <a href="/personalizar" style="display:inline-block;padding:16px 24px;background:#0d0d0d;color:#fcf9f8;text-decoration:none;text-transform:uppercase;letter-spacing:0.05em;">Ver mis diseños</a>
      `),
      text: `Hola ${firstName}, tu diseño basado en ${templateName} fue aprobado. Ya podés agregarlo al carrito.`,
    });
  }

  async sendCustomDesignRejected(
    email: string,
    firstName: string,
    templateName: string,
    reason: string,
  ): Promise<void> {
    await this.send({
      to: email,
      subject: `Tu diseño no fue aprobado — ${this.storeName}`,
      html: this.wrapTemplate(`
        <h2>Hola, ${this.escapeHtml(firstName)}</h2>
        <p>Tu diseño personalizado basado en <strong>${this.escapeHtml(templateName)}</strong> no fue aprobado.</p>
        <p><strong>Motivo:</strong> ${this.escapeHtml(reason)}</p>
        <p>Podés editar el diseño y volver a enviarlo para revisión.</p>
        <a href="/personalizar" style="display:inline-block;padding:16px 24px;background:#0d0d0d;color:#fcf9f8;text-decoration:none;text-transform:uppercase;letter-spacing:0.05em;">Ver mis diseños</a>
      `),
      text: `Hola ${firstName}, tu diseño basado en ${templateName} no fue aprobado. Motivo: ${reason}. Podés editarlo y reenviarlo.`,
    });
  }

  async sendProductionStatusUpdate(
    email: string,
    orderId: string,
    itemName: string,
    status: string,
  ): Promise<void> {
    await this.send({
      to: email,
      subject: `Actualización de producción — #${orderId.slice(-6)}`,
      html: this.wrapTemplate(`
        <h2>Tu prenda avanzó en producción</h2>
        <p>Número de orden: <strong>#${orderId.slice(-6)}</strong></p>
        <p>Producto: <strong>${this.escapeHtml(itemName)}</strong></p>
        <p>Estado de producción: <strong>${this.escapeHtml(status)}</strong></p>
      `),
      text: `Tu orden #${orderId.slice(-6)} - ${itemName} ahora está en estado de producción ${status}.`,
    });
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
      ? `<p><a href="${this.escapeHtml(trackingUrl)}" target="_blank" rel="noopener noreferrer">Rastrear envío</a></p>`
      : '';
    const trackingText = trackingUrl ? ` Link: ${trackingUrl}.` : '';
    await this.send({
      to: email,
      subject: `Actualización de envío — #${orderId.slice(-6)}`,
      html: this.wrapTemplate(`
        <h2>Tu orden tiene novedades de envío</h2>
        <p>Número de orden: <strong>#${orderId.slice(-6)}</strong></p>
        <p>Transporte: <strong>${this.escapeHtml(carrier)}</strong></p>
        <p>Número de seguimiento: <strong>${this.escapeHtml(trackingNumber)}</strong></p>
        ${trackingLink}
        <p>Estado: <strong>${this.escapeHtml(status)}</strong></p>
      `),
      text: `Tu orden #${orderId.slice(-6)} fue enviada por ${carrier}. Seguimiento: ${trackingNumber}.${trackingText} Estado: ${status}.`,
    });
  }

  private wrapTemplate(bodyHtml: string): string {
    return `
      <div style="font-family:Inter,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;color:#0d0d0d;">
        <div style="border-bottom:1px solid #0d0d0d;padding:24px 0;">
          <h1 style="font-family:Bebas Neue,Impact,sans-serif;margin:0;letter-spacing:0.05em;">${this.storeName}</h1>
        </div>
        <div style="padding:32px 0;">${bodyHtml}</div>
        <div style="border-top:1px solid #0d0d0d;padding:24px 0;font-size:12px;color:#747878;">
          <p>© ${new Date().getFullYear()} ${this.storeName}. Todos los derechos reservados.</p>
        </div>
      </div>
    `;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
