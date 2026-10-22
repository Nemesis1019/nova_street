import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { extname } from 'path';

import { getCurrentTenant } from '../tenant/tenant-runtime';

export interface StorageFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

export interface UploadedObject {
  key: string;
  url: string;
}

interface StorageTarget {
  client: S3Client | null;
  bucket: string;
  publicUrl: string;
  /** Prefijo de objetos: el bucket compartido usa `t/<slug>/`. */
  prefix: string;
}

/**
 * Almacenamiento R2 multi-tenant.
 *
 * - Si el tenant no tiene bucket propio: usa el bucket de la plataforma (env
 *   `R2_*`) y prefija los objetos con `t/<slug>/`.
 * - Si el tenant tiene bucket propio (configurado en la BD maestra): usa sus
 *   credenciales/bucket/URL pública y sus objetos van sin prefijo.
 */
@Injectable()
export class R2StorageService {
  private readonly logger = new Logger(R2StorageService.name);
  private readonly clients = new Map<string, S3Client>();
  private readonly presignExpiresIn: number;

  constructor(private readonly configService: ConfigService) {
    this.presignExpiresIn = Number(this.configService.get<string>('PRESIGN_URL_EXPIRATION_SECONDS') ?? '300');
    if (this.configService.get<string>('R2_ACCESS_KEY_ID')) {
      this.logger.log('R2 storage enabled (bucket de plataforma + overrides por tenant)');
    } else {
      this.logger.warn('R2 credentials not configured. Falling back to local storage.');
    }
  }

  private resolve(): StorageTarget {
    const tenant = getCurrentTenant();
    const platform = {
      bucket: this.configService.get<string>('R2_BUCKET') ?? 'ecommerce',
      publicUrl: this.configService.get<string>('R2_PUBLIC_URL') ?? '',
    };

    const accessKeyId = tenant?.r2.accessKeyId ?? this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey =
      tenant?.r2.secretAccessKey ?? this.configService.get<string>('R2_SECRET_ACCESS_KEY');
    const endpoint = tenant?.r2.endpoint ?? this.configService.get<string>('R2_ENDPOINT');

    const tenantOwnsBucket = Boolean(tenant?.r2.bucket);
    const bucket = tenantOwnsBucket ? (tenant?.r2.bucket as string) : platform.bucket;
    const publicUrl = tenantOwnsBucket ? (tenant?.r2.publicUrl ?? '') : platform.publicUrl;
    const prefix = tenant && !tenantOwnsBucket ? `t/${tenant.slug}/` : '';

    let client: S3Client | null = null;
    if (accessKeyId && secretAccessKey && endpoint) {
      const cacheKey = `${endpoint}|${accessKeyId}`;
      client = this.clients.get(cacheKey) ?? null;
      if (!client) {
        client = new S3Client({
          region: 'auto',
          endpoint,
          credentials: { accessKeyId, secretAccessKey },
          forcePathStyle: true,
        });
        this.clients.set(cacheKey, client);
      }
    }

    return { client, bucket, publicUrl, prefix };
  }

  private buildUrl(publicUrl: string, key: string): string {
    if (!publicUrl) return key;
    return `${publicUrl.replace(/\/$/, '')}/${key}`;
  }

  isEnabled(): boolean {
    return Boolean(this.resolve().client);
  }

  async upload(file: StorageFile, folder = 'uploads'): Promise<UploadedObject> {
    const target = this.resolve();
    if (!target.client) {
      throw new Error('R2 storage is not configured');
    }

    const ext = extname(file.originalname) || '.bin';
    const key = `${target.prefix}${folder}/${randomUUID()}${ext}`;

    await target.client.send(
      new PutObjectCommand({
        Bucket: target.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return { key, url: this.buildUrl(target.publicUrl, key) };
  }

  async delete(key: string): Promise<void> {
    const target = this.resolve();
    if (!target.client) {
      throw new Error('R2 storage is not configured');
    }

    await target.client.send(
      new DeleteObjectCommand({
        Bucket: target.bucket,
        Key: key,
      }),
    );
  }

  getPublicUrl(key: string): string {
    if (key.startsWith('http://') || key.startsWith('https://')) return key;
    const target = this.resolve();
    return this.buildUrl(target.publicUrl, key);
  }

  async presignUpload(originalname: string, mimetype: string, folder = 'assets') {
    const target = this.resolve();
    if (!target.client) {
      throw new Error('R2 storage is not configured');
    }

    const ext = extname(originalname) || '.bin';
    const key = `${target.prefix}${folder}/${randomUUID()}${ext}`;

    const command = new PutObjectCommand({
      Bucket: target.bucket,
      Key: key,
      ContentType: mimetype,
    });

    const uploadUrl = await getSignedUrl(target.client, command, { expiresIn: this.presignExpiresIn });

    return { key, uploadUrl, publicUrl: this.buildUrl(target.publicUrl, key) };
  }
}
