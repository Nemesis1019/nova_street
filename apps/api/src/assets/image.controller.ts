import { Controller, Get, NotFoundException, Param, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

@ApiTags('images')
@Controller('images')
export class ImageController {
  @Get(':filename')
  async serve(
    @Param('filename') filename: string,
    @Query('w') width: string,
    @Query('format') format: string,
    @Res() res: Response,
  ) {
    if (!/^[\w\-._]+\.[\w]+$/.test(filename)) {
      throw new NotFoundException('Invalid filename');
    }

    const filepath = join(UPLOAD_DIR, filename);
    if (!existsSync(filepath)) {
      throw new NotFoundException('Image not found');
    }

    const targetWidth = width ? Number(width) : undefined;
    const targetFormat = format && ['webp', 'avif', 'jpeg', 'jpg', 'png'].includes(format.toLowerCase())
      ? format.toLowerCase()
      : undefined;

    if (!targetWidth && !targetFormat) {
      const stream = createReadStream(filepath);
      return stream.pipe(res);
    }

    let pipeline = sharp(filepath);
    const metadata = await pipeline.metadata();

    if (targetWidth && metadata.width && metadata.width > targetWidth) {
      pipeline = pipeline.resize(targetWidth, undefined, { withoutEnlargement: true });
    }

    let contentType = metadata.format ? `image/${metadata.format}` : 'image/jpeg';
    if (targetFormat) {
      switch (targetFormat) {
        case 'webp':
          pipeline = pipeline.webp({ quality: 80 });
          contentType = 'image/webp';
          break;
        case 'avif':
          pipeline = pipeline.avif({ quality: 70 });
          contentType = 'image/avif';
          break;
        case 'png':
          pipeline = pipeline.png();
          contentType = 'image/png';
          break;
        case 'jpg':
        case 'jpeg':
        default:
          pipeline = pipeline.jpeg({ quality: 85 });
          contentType = 'image/jpeg';
          break;
      }
    }

    const buffer = await pipeline.toBuffer();
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.send(buffer);
  }
}
