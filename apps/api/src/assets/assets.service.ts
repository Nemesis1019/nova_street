import { Injectable, Logger } from '@nestjs/common';
import { AssetPurpose, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { createWriteStream, mkdirSync } from 'fs';
import { extname, join } from 'path';

import { PrismaService } from '../prisma/prisma.service';
import { R2StorageService } from '../storage/r2-storage.service';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2Storage: R2StorageService,
  ) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  async upload(
    userId: string,
    file: UploadedFile,
    purpose: AssetPurpose = 'CATALOG_IMAGE',
    relatedId?: string,
  ) {
    if (this.r2Storage.isEnabled()) {
      return this.uploadToR2(userId, file, purpose, relatedId);
    }

    return this.uploadLocal(userId, file, purpose, relatedId);
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
    const object = await this.r2Storage.upload(file, 'assets');

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
