import {
  STOREFRONT_PRESET_META,
  type StorefrontDocument,
  StorefrontDocumentSchema,
  type StorefrontPresetKey,
} from '@ecommerce/shared';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { sign, verify } from 'jsonwebtoken';

import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { getCurrentTenantSlug } from '../tenant/tenant-runtime';
import { getTenantStorefrontUrl } from '../tenant/tenant-url.util';
import type { RecordExperimentEventDto } from './dto/record-experiment-event.dto';
import {
  buildLegacyStorefrontDocument,
  buildStorefrontPreset,
  isStorefrontPresetKey,
} from './storefront-presets';

export interface StorefrontPresetSummary {
  key: string;
  name: string;
  description: string;
  custom?: boolean;
}

interface StoredCustomPreset {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  doc: StorefrontDocument;
}

export type StorefrontApprovalStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface StorefrontApprovalState {
  required: boolean;
  status: StorefrontApprovalStatus;
  requestedAt: string | null;
  reviewedAt: string | null;
  note: string | null;
  hashMatches: boolean | null;
}

export interface StorefrontAdminState {
  draft: StorefrontDocument;
  published: StorefrontDocument | null;
  version: number;
  presets: StorefrontPresetSummary[];
  storefrontUrl: string;
  approval: StorefrontApprovalState;
  canApprove: boolean;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function draftHash(doc: StorefrontDocument): string {
  return createHash('sha256').update(stableStringify(doc)).digest('hex');
}

interface PreviewPayload {
  scope: 'storefront-preview';
  tenantSlug: string;
  sub: string;
}

function parseDocument(value: unknown): StorefrontDocument | null {
  const parsed = StorefrontDocumentSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

@Injectable()
export class StorefrontService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  private async activeConfig() {
    const config = await this.prisma.storeConfig.findFirst({ where: { isActive: true } });
    if (config) return config;

    return this.prisma.storeConfig.create({
      data: {
        name: 'Mi Tienda',
        description: 'Bienvenidos a nuestra tienda',
        primaryColor: '#1F1B16',
        secondaryColor: '#6F7A4E',
        backgroundColor: '#FCF9F8',
        textColor: '#1F1B16',
        currencyCode: 'COP',
        appearanceMode: 'LIGHT',
        surfaceColor: '#FFFFFF',
        surfaceMutedColor: '#F4EFE7',
        borderColor: '#DCD2C4',
        errorColor: '#e03131',
        successColor: '#2f9e44',
        warningColor: '#f76707',
        darkBackgroundColor: '#0d0d0d',
        darkTextColor: '#f5f5f5',
        maintenanceMode: false,
        enableCustomDesigns: true,
        enableNewsletter: true,
        enableCatalogFilters: true,
        template: 'storefront',
        templateConfig: {},
        storefrontConfig: {},
        emailProvider: 'smtp',
        paymentProvider: 'stripe',
        shippingProvider: 'flatRate',
        shippingBaseCost: 10_000,
        termsVersion: 1,
        googleOAuthEnabled: false,
        appleOAuthEnabled: false,
      },
    });
  }

  private customPresets(config: {
    storefrontPresets: Prisma.JsonValue | null;
  }): StoredCustomPreset[] {
    if (!Array.isArray(config.storefrontPresets)) return [];

    return config.storefrontPresets.flatMap((value) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
      const record = value as Record<string, unknown>;
      const doc = parseDocument(record.doc);
      if (
        !doc ||
        typeof record.id !== 'string' ||
        typeof record.name !== 'string' ||
        typeof record.description !== 'string' ||
        typeof record.createdAt !== 'string'
      ) {
        return [];
      }
      return [
        {
          id: record.id,
          name: record.name,
          description: record.description,
          createdAt: record.createdAt,
          doc,
        },
      ];
    });
  }

  private stateFor(
    config: Awaited<ReturnType<StorefrontService['activeConfig']>>,
    user?: AuthenticatedUser,
  ): StorefrontAdminState {
    const draft =
      parseDocument(config.storefrontDraft) ?? buildLegacyStorefrontDocument(config);
    const published = parseDocument(config.storefrontPublished);
    const custom = this.customPresets(config);
    const currentHash = draftHash(draft);
    const approvalHash = config.storefrontApprovalDraftHash;

    return {
      draft,
      published,
      version: config.storefrontVersion,
      presets: [
        ...STOREFRONT_PRESET_META,
        ...custom.map((preset) => ({
          key: `custom:${preset.id}`,
          name: preset.name,
          description: preset.description,
          custom: true,
        })),
      ],
      storefrontUrl: getTenantStorefrontUrl(),
      approval: {
        required: config.requireStorefrontApproval,
        status: config.storefrontApprovalStatus as StorefrontApprovalStatus,
        requestedAt: config.storefrontApprovalRequestedAt?.toISOString() ?? null,
        reviewedAt: config.storefrontApprovalReviewedAt?.toISOString() ?? null,
        note: config.storefrontApprovalNote,
        hashMatches: approvalHash ? approvalHash === currentHash : null,
      },
      canApprove: user?.isPlatform === true,
    };
  }

  async getAdminState(user?: AuthenticatedUser): Promise<StorefrontAdminState> {
    return this.stateFor(await this.activeConfig(), user);
  }

  private approvalResetData() {
    return {
      storefrontApprovalStatus: 'NONE',
      storefrontApprovalDraftHash: null,
      storefrontApprovalRequestedAt: null,
      storefrontApprovalRequestedById: null,
      storefrontApprovalReviewedAt: null,
      storefrontApprovalReviewedById: null,
      storefrontApprovalNote: null,
    };
  }

  async saveDraft(
    doc: unknown,
    userId?: string,
    user?: AuthenticatedUser,
  ): Promise<StorefrontAdminState> {
    const parsed = StorefrontDocumentSchema.safeParse(doc);
    if (!parsed.success) {
      throw new BadRequestException({
        message: 'El documento del storefront no es válido',
        issues: parsed.error.issues,
      });
    }

    const config = await this.activeConfig();
    await this.prisma.storeConfig.update({
      where: { id: config.id },
      data: {
        storefrontDraft: parsed.data as unknown as Prisma.InputJsonValue,
        updatedById: userId,
        ...(config.requireStorefrontApproval ? this.approvalResetData() : {}),
      },
    });

    return this.stateFor(await this.activeConfig(), user);
  }

  async applyPreset(
    key: string,
    userId?: string,
    user?: AuthenticatedUser,
  ): Promise<StorefrontAdminState> {
    const config = await this.activeConfig();
    let doc: StorefrontDocument;

    if (key.startsWith('custom:')) {
      const id = key.slice('custom:'.length);
      const preset = this.customPresets(config).find((item) => item.id === id);
      if (!preset) throw new NotFoundException(`Preset desconocido: ${key}`);
      doc = preset.doc;
    } else {
      if (!isStorefrontPresetKey(key)) {
        throw new NotFoundException(`Preset desconocido: ${key}`);
      }
      doc = buildStorefrontPreset(key as StorefrontPresetKey, config);
    }

    await this.prisma.storeConfig.update({
      where: { id: config.id },
      data: {
        storefrontDraft: doc as unknown as Prisma.InputJsonValue,
        updatedById: userId,
        ...(config.requireStorefrontApproval ? this.approvalResetData() : {}),
      },
    });

    return this.stateFor(await this.activeConfig(), user);
  }

  async saveCustomPreset(
    name: string,
    description: string | undefined,
    userId?: string,
    user?: AuthenticatedUser,
  ): Promise<StorefrontAdminState> {
    const config = await this.activeConfig();
    const doc =
      parseDocument(config.storefrontDraft) ?? buildLegacyStorefrontDocument(config);
    const current = this.customPresets(config);
    const preset: StoredCustomPreset = {
      id: randomUUID(),
      name: name.trim(),
      description: description?.trim() ?? '',
      createdAt: new Date().toISOString(),
      doc,
    };

    await this.prisma.storeConfig.update({
      where: { id: config.id },
      data: {
        storefrontPresets: [...current, preset].slice(-20) as unknown as Prisma.InputJsonValue,
        updatedById: userId,
      },
    });

    return this.stateFor(await this.activeConfig(), user);
  }

  async deleteCustomPreset(
    id: string,
    userId?: string,
    user?: AuthenticatedUser,
  ): Promise<StorefrontAdminState> {
    const config = await this.activeConfig();
    const current = this.customPresets(config);
    if (!current.some((preset) => preset.id === id)) {
      throw new NotFoundException('Preset no encontrado');
    }

    await this.prisma.storeConfig.update({
      where: { id: config.id },
      data: {
        storefrontPresets: current
          .filter((preset) => preset.id !== id) as unknown as Prisma.InputJsonValue,
        updatedById: userId,
      },
    });

    return this.stateFor(await this.activeConfig(), user);
  }

  async publish(userId?: string, user?: AuthenticatedUser): Promise<StorefrontAdminState> {
    const config = await this.activeConfig();
    const draft =
      parseDocument(config.storefrontDraft) ?? buildLegacyStorefrontDocument(config);
    const nextVersion = config.storefrontVersion + 1;
    const isPlatform = user?.isPlatform === true;

    if (config.requireStorefrontApproval && !isPlatform) {
      if (config.storefrontApprovalStatus !== 'APPROVED') {
        throw new ForbiddenException('La publicación requiere aprobación de plataforma');
      }
      if (
        !config.storefrontApprovalDraftHash ||
        config.storefrontApprovalDraftHash !== draftHash(draft)
      ) {
        throw new BadRequestException(
          'El borrador cambió desde la aprobación. Enviá una nueva revisión.',
        );
      }
    }

    const approvalReset = config.requireStorefrontApproval
      ? this.approvalResetData()
      : {};

    await this.prisma.$transaction(async (tx) => {
      await tx.storeConfig.update({
        where: { id: config.id },
        data: {
          storefrontDraft: draft as unknown as Prisma.InputJsonValue,
          storefrontPublished: draft as unknown as Prisma.InputJsonValue,
          storefrontVersion: nextVersion,
          updatedById: userId,
          ...approvalReset,
        },
      });

      await tx.storefrontRevision.create({
        data: {
          version: nextVersion,
          snapshot: draft as unknown as Prisma.InputJsonValue,
          createdById: userId,
        },
      });
    });

    await this.auditService.log({
      userId,
      action: 'PUBLISH_STOREFRONT',
      entity: 'StoreConfig',
      entityId: config.id,
      after: { version: nextVersion, presetKey: draft.presetKey },
    });

    return this.stateFor(await this.activeConfig(), user);
  }

  async getVersions() {
    return this.prisma.storefrontRevision.findMany({
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        createdAt: true,
        createdById: true,
      },
      take: 50,
    });
  }

  async restoreVersion(
    id: string,
    userId?: string,
    user?: AuthenticatedUser,
  ): Promise<StorefrontAdminState> {
    const revision = await this.prisma.storefrontRevision.findUnique({ where: { id } });
    if (!revision) throw new NotFoundException('Versión no encontrada');

    const parsed = StorefrontDocumentSchema.safeParse(revision.snapshot);
    if (!parsed.success) throw new BadRequestException('La versión guardada no es válida');

    const config = await this.activeConfig();
    await this.prisma.storeConfig.update({
      where: { id: config.id },
      data: {
        storefrontDraft: parsed.data as unknown as Prisma.InputJsonValue,
        updatedById: userId,
        ...(config.requireStorefrontApproval ? this.approvalResetData() : {}),
      },
    });

    await this.auditService.log({
      userId,
      action: 'RESTORE_STOREFRONT_VERSION',
      entity: 'StorefrontRevision',
      entityId: revision.id,
      after: { version: revision.version },
    });

    return this.stateFor(await this.activeConfig(), user);
  }

  async submitForApproval(
    userId?: string,
    user?: AuthenticatedUser,
  ): Promise<StorefrontAdminState> {
    const config = await this.activeConfig();
    if (!config.requireStorefrontApproval) {
      throw new BadRequestException('Este cliente no requiere aprobación de publicación');
    }

    const draft =
      parseDocument(config.storefrontDraft) ?? buildLegacyStorefrontDocument(config);
    const hash = draftHash(draft);

    await this.prisma.storeConfig.update({
      where: { id: config.id },
      data: {
        storefrontApprovalStatus: 'PENDING',
        storefrontApprovalDraftHash: hash,
        storefrontApprovalRequestedAt: new Date(),
        storefrontApprovalRequestedById: userId,
        storefrontApprovalReviewedAt: null,
        storefrontApprovalReviewedById: null,
        storefrontApprovalNote: null,
        updatedById: userId,
      },
    });

    await this.auditService.log({
      userId,
      action: 'SUBMIT_STOREFRONT_APPROVAL',
      entity: 'StoreConfig',
      entityId: config.id,
      after: { draftHash: hash },
    });

    return this.stateFor(await this.activeConfig(), user);
  }

  async approveForApproval(
    note: string | undefined,
    userId?: string,
    user?: AuthenticatedUser,
  ): Promise<StorefrontAdminState> {
    if (!user?.isPlatform) throw new ForbiddenException('Solo plataforma puede aprobar');
    const config = await this.activeConfig();
    if (!config.requireStorefrontApproval) {
      throw new BadRequestException('Este cliente no requiere aprobación de publicación');
    }
    if (config.storefrontApprovalStatus !== 'PENDING') {
      throw new BadRequestException('No hay una revisión pendiente');
    }

    const draft =
      parseDocument(config.storefrontDraft) ?? buildLegacyStorefrontDocument(config);
    if (
      !config.storefrontApprovalDraftHash ||
      config.storefrontApprovalDraftHash !== draftHash(draft)
    ) {
      throw new BadRequestException(
        'El borrador cambió desde que se envió a revisión. Pedí un nuevo envío.',
      );
    }

    await this.prisma.storeConfig.update({
      where: { id: config.id },
      data: {
        storefrontApprovalStatus: 'APPROVED',
        storefrontApprovalReviewedAt: new Date(),
        storefrontApprovalReviewedById: userId,
        storefrontApprovalNote: note?.trim() || null,
      },
    });

    await this.auditService.log({
      userId,
      action: 'APPROVE_STOREFRONT',
      entity: 'StoreConfig',
      entityId: config.id,
      after: { status: 'APPROVED' },
    });

    return this.stateFor(await this.activeConfig(), user);
  }

  async rejectForApproval(
    note: string | undefined,
    userId?: string,
    user?: AuthenticatedUser,
  ): Promise<StorefrontAdminState> {
    if (!user?.isPlatform) throw new ForbiddenException('Solo plataforma puede rechazar');
    const config = await this.activeConfig();
    if (!config.requireStorefrontApproval) {
      throw new BadRequestException('Este cliente no requiere aprobación de publicación');
    }
    if (config.storefrontApprovalStatus !== 'PENDING') {
      throw new BadRequestException('No hay una revisión pendiente');
    }

    await this.prisma.storeConfig.update({
      where: { id: config.id },
      data: {
        storefrontApprovalStatus: 'REJECTED',
        storefrontApprovalReviewedAt: new Date(),
        storefrontApprovalReviewedById: userId,
        storefrontApprovalNote: note?.trim() || null,
      },
    });

    await this.auditService.log({
      userId,
      action: 'REJECT_STOREFRONT',
      entity: 'StoreConfig',
      entityId: config.id,
      after: { status: 'REJECTED', note: note ?? null },
    });

    return this.stateFor(await this.activeConfig(), user);
  }

  async setApprovalRequired(
    required: boolean,
    userId?: string,
    user?: AuthenticatedUser,
  ): Promise<StorefrontAdminState> {
    if (!user?.isPlatform) {
      throw new ForbiddenException('Solo plataforma puede cambiar el workflow de aprobación');
    }
    const config = await this.activeConfig();

    await this.prisma.storeConfig.update({
      where: { id: config.id },
      data: {
        requireStorefrontApproval: required,
        ...this.approvalResetData(),
        updatedById: userId,
      },
    });

    await this.auditService.log({
      userId,
      action: 'SET_STOREFRONT_APPROVAL_REQUIRED',
      entity: 'StoreConfig',
      entityId: config.id,
      after: { required },
    });

    return this.stateFor(await this.activeConfig(), user);
  }

  /**
   * Registra impresiones y clics de un experimento publicado. Es un endpoint
   * público y anónimo: no recibe cookies, email ni identificadores personales.
   */
  async recordExperimentEvent(dto: RecordExperimentEventDto) {
    const config = await this.activeConfig();
    const published = parseDocument(config.storefrontPublished);
    const experiment = published?.experiments.find(
      (item) => item.id === dto.experimentId && item.enabled,
    );

    if (!experiment) return { recorded: false };

    const now = Date.now();
    const startsAt = experiment.startedAt ? new Date(experiment.startedAt).getTime() : null;
    const endsAt = experiment.endedAt ? new Date(experiment.endedAt).getTime() : null;
    if (
      (startsAt !== null && Number.isFinite(startsAt) && startsAt > now) ||
      (endsAt !== null && Number.isFinite(endsAt) && endsAt < now)
    ) {
      return { recorded: false };
    }

    await this.prisma.storefrontExperimentEvent.create({
      data: {
        experimentId: dto.experimentId,
        variant: dto.variant,
        event: dto.event,
        path: dto.path,
      },
    });

    return { recorded: true };
  }

  async getExperimentResults(experimentId: string) {
    const groups = await this.prisma.storefrontExperimentEvent.groupBy({
      by: ['variant', 'event'],
      where: { experimentId },
      _count: { _all: true },
    });

    const variants = (['A', 'B'] as const).map((variant) => {
      const impressions =
        groups.find((group) => group.variant === variant && group.event === 'impression')?._count
          ._all ?? 0;
      const clicks =
        groups.find((group) => group.variant === variant && group.event === 'cta_click')?._count
          ._all ?? 0;

      return {
        variant,
        impressions,
        clicks,
        ctr: impressions > 0 ? Number((clicks / impressions).toFixed(4)) : 0,
      };
    });

    return {
      experimentId,
      variants,
      totalImpressions: variants.reduce((sum, variant) => sum + variant.impressions, 0),
      totalClicks: variants.reduce((sum, variant) => sum + variant.clicks, 0),
    };
  }

  async createPreviewToken(userId: string) {
    const tenantSlug = getCurrentTenantSlug();
    if (!tenantSlug) throw new BadRequestException('No hay tenant en contexto');

    const token = sign(
      { scope: 'storefront-preview', tenantSlug, sub: userId } satisfies PreviewPayload,
      this.configService.getOrThrow<string>('JWT_SECRET'),
      { expiresIn: '30m' },
    );

    return { token, expiresIn: '30m' };
  }

  async getPreviewDocument(token: string): Promise<StorefrontDocument> {
    if (!token) throw new UnauthorizedException('Falta el token de preview');

    let payload: PreviewPayload;
    try {
      payload = verify(token, this.configService.getOrThrow<string>('JWT_SECRET')) as PreviewPayload;
    } catch {
      throw new UnauthorizedException('Preview expirado o inválido');
    }

    if (payload.scope !== 'storefront-preview') {
      throw new UnauthorizedException('Token de preview inválido');
    }
    if (payload.tenantSlug !== getCurrentTenantSlug()) {
      throw new UnauthorizedException('El preview pertenece a otra tienda');
    }

    const config = await this.activeConfig();
    return (
      parseDocument(config.storefrontDraft) ?? buildLegacyStorefrontDocument(config)
    );
  }
}
