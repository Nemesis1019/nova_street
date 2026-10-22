import { Body, Controller, ForbiddenException, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { AuditService } from '../audit/audit.service';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permission } from '../auth/permissions';
import { getTenantStorefrontUrl } from '../tenant/tenant-url.util';
import { StoreConfigResponseDto } from './dto/store-config-response.dto';
import { UpdateStoreConfigDto } from './dto/update-store-config.dto';
import { StoreConfigService } from './store-config.service';

/** Campos de configuración de proveedores/API keys reservados al Super Admin. */
const PROVIDER_CONFIG_FIELDS: Array<keyof UpdateStoreConfigDto> = [
  'paymentProvider',
  'boldApiKey',
  'boldSecretKey',
  'boldSandbox',
  'stripePublishableKey',
  'stripeSecretKey',
  'stripeWebhookSecret',
  'emailProvider',
  'smtpHost',
  'smtpPort',
  'smtpUser',
  'smtpPass',
  'smtpSecure',
  'smtpFrom',
  'resendApiKey',
  'resendFrom',
  'googleOAuthEnabled',
  'googleClientId',
  'appleOAuthEnabled',
  'appleClientId',
];

/** Claves que nunca deben quedar registradas en la auditoría. */
const SECRET_FIELDS = [
  'boldSecretKey',
  'shippingApiKey',
  'stripeSecretKey',
  'stripeWebhookSecret',
  'smtpPass',
  'resendApiKey',
];

@ApiTags('store-config')
@Controller('store-config')
export class StoreConfigController {
  constructor(
    private readonly storeConfigService: StoreConfigService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @ApiOkResponse({ type: StoreConfigResponseDto })
  async getConfig() {
    const config = await this.storeConfigService.findOrCreateDefault();
    return {
      ...this.toPublicConfig(config),
      storefrontUrl: getTenantStorefrontUrl(),
    };
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePermission(Permission.STORE_CONFIG_WRITE)
  @ApiBearerAuth()
  @ApiOkResponse({ type: StoreConfigResponseDto })
  async updateConfig(@Req() req: Request, @Body() dto: UpdateStoreConfigDto) {
    const user = req.user as { userId: string; permissions?: string[]; isPlatform?: boolean };
    const userId = user.userId;
    const before = await this.storeConfigService.findOrCreateDefault();

    this.assertProviderPermission(user, dto, before as unknown as Record<string, unknown>);

    const updated = await this.storeConfigService.update(dto, userId);

    await this.auditService.log({
      userId,
      action: 'UPDATE_STORE_CONFIG',
      entity: 'StoreConfig',
      entityId: before.id,
      before: this.storeConfigSnapshot(before),
      after: this.storeConfigSnapshot(updated),
    });

    return this.toPublicConfig(updated);
  }

  /**
   * Vista pública de la configuración: nunca devuelve credenciales; informa
   * con flags si están configuradas. Se usa en GET y PATCH (antes el PATCH
   * devolvía los secretos).
   */
  private toPublicConfig(config: {
    shippingApiKey?: string | null;
    shippingAccountId?: string | null;
    boldSecretKey?: string | null;
    stripeSecretKey?: string | null;
    stripeWebhookSecret?: string | null;
    smtpPass?: string | null;
    resendApiKey?: string | null;
    boldApiKey?: string | null;
    [key: string]: unknown;
  }) {
    const {
      shippingApiKey: _shippingApiKey,
      shippingAccountId: _shippingAccountId,
      boldSecretKey: _boldSecretKey,
      stripeSecretKey: _stripeSecretKey,
      stripeWebhookSecret: _stripeWebhookSecret,
      smtpPass: _smtpPass,
      resendApiKey: _resendApiKey,
      ...publicConfig
    } = config;

    return {
      ...publicConfig,
      boldSecretConfigured: Boolean(config.boldSecretKey),
      stripeSecretConfigured: Boolean(config.stripeSecretKey),
      stripeWebhookConfigured: Boolean(config.stripeWebhookSecret),
      smtpPassConfigured: Boolean(config.smtpPass),
      resendApiKeyConfigured: Boolean(config.resendApiKey),
    };
  }

  /**
   * Solo los superadmins de plataforma (`isPlatform`) pueden **cambiar** la
   * configuración de proveedores/API keys. No alcanza con el permiso
   * `providers:write` de un rol del tenant: la identidad sensible es la
   * cuenta transversal. Enviar los mismos valores no requiere nada.
   */
  private assertProviderPermission(
    user: { permissions?: string[]; isPlatform?: boolean },
    dto: UpdateStoreConfigDto,
    before: Record<string, unknown>,
  ) {
    const changesProviders = PROVIDER_CONFIG_FIELDS.some((field) => {
      const rawValue = dto[field];
      // Las llaves secretas vacías significan "no cambiar".
      const value = SECRET_FIELDS.includes(field) && !rawValue ? undefined : rawValue;
      if (value === undefined) return false;
      return value !== before[field];
    });

    if (!changesProviders) return;

    if (!user.isPlatform) {
      throw new ForbiddenException(
        'Solo los superadmins de plataforma pueden modificar la configuración de proveedores y API keys',
      );
    }
  }

  private storeConfigSnapshot(config: Record<string, unknown>): Record<string, unknown> {
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = config;
    for (const field of SECRET_FIELDS) {
      if (rest[field] !== undefined) {
        rest[field] = rest[field] ? '[redacted]' : null;
      }
    }
    return rest;
  }
}
