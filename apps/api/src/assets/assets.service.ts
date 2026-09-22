import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AssetPurpose, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { createWriteStream, mkdirSync } from 'fs';
import { extname, join } from 'path';

import { PrismaService } from '../prisma/prisma.service';
import { R2StorageService } from '../storage/r2-storage.service';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

const PURPOSE_FOLDERS: Record<AssetPurpose, string> = {
  CATALOG_IMAGE: 'catalog',
  CUSTOM_DESIGN_ASSET: 'custom-designs',
  PRINT_FILE: 'print-files',
  REVIEW_IMAGE: 'reviews',
};

const ALLOWED_MIME_TYPES: Record<AssetPurpose, string[]> = {
  CATALOG_IMAGE: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'],
  CUSTOM_DESIGN_ASSET: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml'],
  REVIEW_IMAGE: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'],
  PRINT_FILE: ['application/pdf', 'image/png', 'image/jpeg', 'image/tiff'],
};

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);
  private readonly maxFileSize: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2Storage: R2StorageService,
    private readonly configService: ConfigService,
  ) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
    this.maxFileSize = Number(this.configService.get<string>('PRESIGN_MAX_FILE_SIZE_BYTES') ?? String(10 * 1024 * 1024));
  }

  async upload(
    userId: string,
    file: UploadedFile,
    purpose: AssetPurpose = 'CATALOG_IMAGE',
    relatedId?: string,
  ) {
    this.validateFile(file.mimetype, file.size, purpose);

    if (this.r2Storage.isEnabled()) {
      return this.uploadToR2(userId, file, purpose, relatedId);
    }

    return this.uploadLocal(userId, file, purpose, relatedId);
  }

  async presign(
    userId: string,
    filename: string,
    mimeType: string,
    purpose: AssetPurpose = 'CATALOG_IMAGE',
    size?: number,
  ) {
    if (!this.r2Storage.isEnabled()) {
      throw new BadRequestException('Presigned uploads require R2 storage to be configured');
    }

    if (size === undefined) {
      throw new BadRequestException('File size is required for presigned uploads');
    }

    this.validateFile(mimeType, size, purpose);

    const folder = PURPOSE_FOLDERS[purpose];
    const { uploadUrl, key, publicUrl } = await this.r2Storage.presignUpload(filename, mimeType, folder);

    const data: Prisma.AssetCreateInput = {
      ownerId: userId,
      purpose,
      bucket: 'r2',
      objectKey: key,
      mimeType,
      size,
      uploadedById: userId,
    };

    const asset = await this.prisma.asset.create({ data });

    return {
      id: asset.id,
      uploadUrl,
      url: publicUrl,
      mimeType: asset.mimeType,
      size: asset.size,
    };
  }

  private validateFile(mimeType: string, size: number, purpose: AssetPurpose) {
    if (Number.isNaN(size) || size <= 0) {
      throw new BadRequestException('Invalid file size');
    }

    if (size > this.maxFileSize) {
      throw new BadRequestException(`File exceeds maximum allowed size of ${this.maxFileSize} bytes`);
    }

    const allowed = ALLOWED_MIME_TYPES[purpose] ?? [];
    if (!allowed.includes(mimeType.toLowerCase())) {
      throw new BadRequestException(`Mime type ${mimeType} is not allowed for purpose ${purpose}`);
    }
  }

  async createExternal(userId: string, url: string, purpose: AssetPurpose = 'CATALOG_IMAGE', relatedId?: string) {
    const data: Prisma.AssetCreateInput = {
      ownerId: userId,
      purpose,
      bucket: 'external',
      objectKey: url,
      mimeType: 'image/unknown',
      size: 0,
      uploadedById: userId,
      relatedId: relatedId ?? null,
    };

    const asset = await this.prisma.asset.create({ data });

    return {
      id: asset.id,
      url: asset.objectKey,
      mimeType: asset.mimeType,
      size: asset.size,
    };
  }

  private async uploadLocal(
    userId: string,
    file: UploadedFile,
    purpose: AssetPurpose,
    relatedId?: string,
  ) {
    const ext = extname(file.originalname) || '.bin';
    const filename = `${randomUUID()}${ext}`;
    const filepath = join(UPLOAD_DIR, filename);

    await new Promise<void>((resolve, reject) => {
      const stream = createWriteStream(filepath);
      stream.write(file.buffer);
      stream.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    const data: Prisma.AssetCreateInput = {
      ownerId: userId,
      purpose,
      bucket: 'local',
      objectKey: filename,
      mimeType: file.mimetype,
      size: file.size,
      uploadedById: userId,
      relatedId: relatedId ?? null,
    };

    const asset = await this.prisma.asset.create({ data });

    const baseUrl = process.env.APP_URL ?? 'http://localhost:4000';
    return {
      id: asset.id,
      url: `${baseUrl}/uploads/${filename}`,
      mimeType: asset.mimeType,
      size: asset.size,
    };
  }

  private async uploadToR2(
    userId: string,
    file: UploadedFile,
    purpose: AssetPurpose,
    relatedId?: string,
  ) {
    const folder = PURPOSE_FOLDERS[purpose];
    const object = await this.r2Storage.upload(file, folder);

    const data: Prisma.AssetCreateInput = {
      ownerId: userId,
      purpose,
      bucket: 'r2',
      objectKey: object.key,
      mimeType: file.mimetype,
      size: file.size,
      uploadedById: userId,
      relatedId: relatedId ?? null,
    };

    const asset = await this.prisma.asset.create({ data });

    return {
      id: asset.id,
      url: object.url,
      mimeType: asset.mimeType,
      size: asset.size,
    };
  }
}
