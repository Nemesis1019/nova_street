import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { extname } from 'path';

export interface StorageFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

export interface UploadedObject {
  key: string;
  url: string;
}

@Injectable()
export class R2StorageService {
  private readonly logger = new Logger(R2StorageService.name);
  private readonly client: S3Client | null = null;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY');
    const endpoint = this.configService.get<string>('R2_ENDPOINT');
    this.bucket = this.configService.get<string>('R2_BUCKET') ?? 'ecommerce';
    this.publicUrl = this.configService.get<string>('R2_PUBLIC_URL') ?? '';

    this.enabled = !!(accessKeyId && secretAccessKey && endpoint);

    if (this.enabled && accessKeyId && secretAccessKey && endpoint) {
      this.client = new S3Client({
        region: 'auto',
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
        forcePathStyle: true,
      });
      this.logger.log('R2 storage enabled');
    } else {
      this.logger.warn('R2 credentials not configured. Falling back to local storage.');
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async upload(file: StorageFile, folder = 'uploads'): Promise<UploadedObject> {
    if (!this.client) {
      throw new Error('R2 storage is not configured');
    }

    const ext = extname(file.originalname) || '.bin';
    const key = `${folder}/${randomUUID()}${ext}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const url = this.publicUrl ? `${this.publicUrl.replace(/\/$/, '')}/${key}` : key;
    return { key, url };
  }

  getPublicUrl(key: string): string {
    if (!this.publicUrl) return key;
    if (key.startsWith('http://') || key.startsWith('https://')) return key;
    return `${this.publicUrl.replace(/\/$/, '')}/${key}`;
  }
}
