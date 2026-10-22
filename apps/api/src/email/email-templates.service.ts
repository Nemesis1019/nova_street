import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../prisma/prisma.service';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { DEFAULT_EMAIL_TEMPLATES, getDefaultTemplate } from './templates/default-templates';
import { renderTemplate } from './templates/render-template';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * El header/footer del layout se guarda como dos plantillas custom reservadas
 * por tenant. No aparecen en el listado del admin; se editan desde el modal
 * "Header y footer" de Plantillas de email.
 */
export const EMAIL_HEADER_KEY = '__email-header__';
export const EMAIL_FOOTER_KEY = '__email-footer__';
export const RESERVED_LAYOUT_KEYS = new Set([EMAIL_HEADER_KEY, EMAIL_FOOTER_KEY]);

export const DEFAULT_EMAIL_HEADER_HTML =
  '<h1 style="font-family:Bebas Neue,Impact,sans-serif;margin:0;letter-spacing:0.05em;">{{storeName}}</h1>';
export const DEFAULT_EMAIL_FOOTER_HTML =
  '<p>© {{year}} {{storeName}}. Todos los derechos reservados.</p>';

interface EmailLayoutContext {
  storeName: string;
  logoUrl: string;
  headerHtml: string;
  footerHtml: string;
}

@Injectable()
export class EmailTemplatesService {
  private readonly storeName: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.storeName = this.configService.get<string>('STORE_NAME') ?? 'NÖVA';
  }

  /**
   * Renderiza una plantilla por key. Usa la versión personalizada de la DB si
   * existe y está habilitada; si no, cae al default en código. Las plantillas
   * custom (creadas desde el admin) se renderizan directo desde la DB.
   * Las variables desconocidas se reemplazan por vacío. `storeName` siempre está disponible.
   */
  async render(key: string, vars: Record<string, string>): Promise<RenderedEmail> {
    const [definition, override, layout] = await Promise.all([
      Promise.resolve(getDefaultTemplate(key)),
      this.prisma.emailTemplate.findUnique({ where: { key } }),
      this.getLayoutContext(),
    ]);

    if (!definition && !override) {
      throw new NotFoundException(`Unknown email template: ${key}`);
    }

    // El branding del tenant manda sobre cualquier sample/override de vars.
    const allVars: Record<string, string> = {
      ...vars,
      storeName: layout.storeName,
      logoUrl: layout.logoUrl,
      year: String(new Date().getFullYear()),
    };

    if (!definition) {
      const html = renderTemplate(override!.html, allVars);
      return {
        subject: renderTemplate(override!.subject, allVars),
        html: this.wrapLayout(html, layout, allVars),
        text: this.htmlToText(html),
      };
    }

    const source =
      override && override.enabled
          ? { subject: override.subject, html: override.html, text: definition.text }
          : { subject: definition.subject, html: definition.html, text: definition.text };

    return {
      subject: renderTemplate(source.subject, allVars),
      html: this.wrapLayout(renderTemplate(source.html, allVars), layout, allVars),
      text: renderTemplate(source.text, allVars),
    };
  }

  /** Branding y fragmentos editables que envuelven todos los emails del tenant. */
  private async getLayoutContext(): Promise<EmailLayoutContext> {
    const [config, header, footer] = await Promise.all([
      this.prisma.storeConfig.findFirst({
        where: { isActive: true },
        select: { name: true, logoUrl: true },
      }),
      this.prisma.emailTemplate.findUnique({ where: { key: EMAIL_HEADER_KEY } }),
      this.prisma.emailTemplate.findUnique({ where: { key: EMAIL_FOOTER_KEY } }),
    ]);

    return {
      storeName: config?.name?.trim() || this.storeName,
      logoUrl: config?.logoUrl?.trim() ?? '',
      headerHtml:
        header?.enabled && header.html.trim() ? header.html : DEFAULT_EMAIL_HEADER_HTML,
      footerHtml:
        footer?.enabled && footer.html.trim() ? footer.html : DEFAULT_EMAIL_FOOTER_HTML,
    };
  }

  /** Lista todas las plantillas conocidas (defaults + custom) con su override de DB. */
  async findAll() {
    const overrides = await this.prisma.emailTemplate.findMany();
    const byKey = new Map(overrides.map((template) => [template.key, template]));
    const defaultKeys = new Set(DEFAULT_EMAIL_TEMPLATES.map((definition) => definition.key));

    const defaults = DEFAULT_EMAIL_TEMPLATES.map((definition) => {
      const override = byKey.get(definition.key);
      return {
        key: definition.key,
        name: override?.name ?? definition.name,
        description: override?.description ?? definition.description,
        subject: override?.subject ?? definition.subject,
        enabled: override?.enabled ?? true,
        isCustomized: !!override,
        isCustom: false,
        updatedAt: override?.updatedAt ?? null,
        variables: definition.variables,
      };
    });

    const customs = overrides
      .filter(
        (template) =>
          !defaultKeys.has(template.key) && !RESERVED_LAYOUT_KEYS.has(template.key),
      )
      .map((template) => ({
        key: template.key,
        name: template.name,
        description: template.description,
        subject: template.subject,
        enabled: template.enabled,
        isCustomized: true,
        isCustom: true,
        updatedAt: template.updatedAt,
        variables: [],
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return [...defaults, ...customs];
  }

  async findOne(key: string) {
    const definition = getDefaultTemplate(key);
    const override = await this.prisma.emailTemplate.findUnique({ where: { key } });

    if (!definition) {
      if (!override) {
        throw new NotFoundException(`Unknown email template: ${key}`);
      }
      return {
        key: override.key,
        name: override.name,
        description: override.description,
        subject: override.subject,
        html: override.html,
        enabled: override.enabled,
        isCustomized: true,
        isCustom: true,
        variables: [],
        defaults: {
          subject: override.subject,
          html: override.html,
        },
      };
    }

    return {
      key: definition.key,
      name: override?.name ?? definition.name,
      description: override?.description ?? definition.description,
      subject: override?.subject ?? definition.subject,
      html: override?.html ?? definition.html,
      enabled: override?.enabled ?? true,
      isCustomized: !!override,
      isCustom: false,
      variables: definition.variables,
      defaults: {
        subject: definition.subject,
        html: definition.html,
      },
    };
  }

  /** Crea una plantilla custom (no reservada por el sistema). */
  async create(dto: CreateEmailTemplateDto) {
    const key = dto.key.trim().toLowerCase();

    if (getDefaultTemplate(key)) {
      throw new ConflictException(`Template key "${key}" is reserved by the system`);
    }
    const existing = await this.prisma.emailTemplate.findUnique({ where: { key } });
    if (existing) {
      throw new ConflictException(`Template key "${key}" already exists`);
    }

    await this.prisma.emailTemplate.create({
      data: {
        key,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        subject: dto.subject,
        html: dto.html,
        enabled: true,
      },
    });

    return this.findOne(key);
  }

  async upsert(key: string, data: { name?: string; subject: string; html: string; enabled?: boolean }) {
    const definition = getDefaultTemplate(key);

    if (!definition) {
      const existing = await this.prisma.emailTemplate.findUnique({ where: { key } });
      if (!existing) {
        // Los fragmentos reservados del layout se crean on-demand desde el
        // editor de header/footer; el resto de keys custom debe existir.
        if (!RESERVED_LAYOUT_KEYS.has(key)) {
          throw new NotFoundException(`Unknown email template: ${key}`);
        }
        return this.prisma.emailTemplate.create({
          data: {
            key,
            name: data.name ?? 'Layout de email',
            description: 'Fragmento global del layout de emails',
            subject: data.subject,
            html: data.html,
            enabled: data.enabled ?? true,
          },
        });
      }
      return this.prisma.emailTemplate.update({
        where: { key },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          subject: data.subject,
          html: data.html,
          ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
        },
      });
    }

    return this.prisma.emailTemplate.upsert({
      where: { key },
      create: {
        key,
        name: data.name ?? definition.name,
        description: definition.description,
        subject: data.subject,
        html: data.html,
        enabled: data.enabled ?? true,
      },
      update: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        subject: data.subject,
        html: data.html,
        ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
      },
    });
  }

  /** Elimina el override/plantilla custom; los defaults vuelven al código. */
  async reset(key: string) {
    const definition = getDefaultTemplate(key);
    const override = await this.prisma.emailTemplate.findUnique({ where: { key } });
    if (!definition && !override) {
      throw new NotFoundException(`Unknown email template: ${key}`);
    }
    await this.prisma.emailTemplate.deleteMany({ where: { key } });
    return { key, reset: true };
  }

  /** Renderiza con valores de ejemplo para la vista previa del admin. */
  async preview(
    key: string,
    override?: { subject?: string; html?: string; headerHtml?: string; footerHtml?: string },
  ): Promise<RenderedEmail> {
    const [definition, dbOverride, layout] = await Promise.all([
      Promise.resolve(getDefaultTemplate(key)),
      this.prisma.emailTemplate.findUnique({ where: { key } }),
      this.getLayoutContext(),
    ]);
    const previewLayout: EmailLayoutContext = {
      ...layout,
      headerHtml:
        override?.headerHtml !== undefined
          ? override.headerHtml.trim() || DEFAULT_EMAIL_HEADER_HTML
          : layout.headerHtml,
      footerHtml:
        override?.footerHtml !== undefined
          ? override.footerHtml.trim() || DEFAULT_EMAIL_FOOTER_HTML
          : layout.footerHtml,
    };
    const layoutVars: Record<string, string> = {
      storeName: previewLayout.storeName,
      logoUrl: previewLayout.logoUrl,
      year: String(new Date().getFullYear()),
    };
    const hasLayoutOverride =
      override?.headerHtml !== undefined || override?.footerHtml !== undefined;

    if (!definition) {
      if (!dbOverride) {
        throw new NotFoundException(`Unknown email template: ${key}`);
      }
      const allVars: Record<string, string> = { ...this.getCommonSampleVars(), ...layoutVars };
      const html = renderTemplate(override?.html ?? dbOverride.html, allVars);
      return {
        subject: renderTemplate(override?.subject ?? dbOverride.subject, allVars),
        html: this.wrapLayout(html, previewLayout, allVars),
        text: this.htmlToText(html),
      };
    }

    const sampleVars = Object.fromEntries(definition.variables.map((variable) => [variable.name, variable.sample]));

    if (!override?.subject && !override?.html && !hasLayoutOverride) {
      return this.render(key, sampleVars);
    }

    const allVars: Record<string, string> = { ...sampleVars, ...layoutVars };

    return {
      subject: renderTemplate(override?.subject ?? dbOverride?.subject ?? definition.subject, allVars),
      html: this.wrapLayout(
        renderTemplate(override?.html ?? dbOverride?.html ?? definition.html, allVars),
        previewLayout,
        allVars,
      ),
      text: renderTemplate(definition.text, allVars),
    };
  }

  /** Variables de ejemplo para el envío de prueba de una plantilla. */
  async getSampleVarsFor(key: string): Promise<Record<string, string>> {
    const definition = getDefaultTemplate(key);
    if (!definition) {
      return this.getCommonSampleVars();
    }
    return Object.fromEntries(definition.variables.map((variable) => [variable.name, variable.sample]));
  }

  /** Unión de variables de ejemplo de todas las plantillas default. */
  private getCommonSampleVars(): Record<string, string> {
    const vars: Record<string, string> = {};
    for (const definition of DEFAULT_EMAIL_TEMPLATES) {
      for (const variable of definition.variables) {
        if (!(variable.name in vars)) {
          vars[variable.name] = variable.sample;
        }
      }
    }
    return vars;
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private wrapLayout(
    bodyHtml: string,
    layout: EmailLayoutContext,
    vars: Record<string, string>,
  ): string {
    const headerHtml = renderTemplate(layout.headerHtml, vars);
    const footerHtml = renderTemplate(layout.footerHtml, vars);

    return `
      <div style="font-family:Inter,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;color:#0d0d0d;">
        <div style="border-bottom:1px solid #0d0d0d;padding:24px 0;">${headerHtml}</div>
        <div style="padding:32px 0;">${bodyHtml}</div>
        <div style="border-top:1px solid #0d0d0d;padding:24px 0;font-size:12px;color:#747878;">${footerHtml}</div>
      </div>
    `;
  }
}
