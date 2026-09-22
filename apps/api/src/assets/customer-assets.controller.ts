import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AssetPurpose } from '@prisma/client';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AssetsService } from './assets.service';
import { AssetResponseDto } from './dto/asset-response.dto';
import { PresignAssetDto } from './dto/presign-asset.dto';
import { PresignAssetResponseDto } from './dto/presign-asset-response.dto';

@ApiTags('assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assets')
export class CustomerAssetsController {
  private readonly allowedPresignPurposes: AssetPurpose[] = ['CUSTOM_DESIGN_ASSET', 'REVIEW_IMAGE'];

  constructor(private readonly assetsService: AssetsService) {}

  @Post('presign')
  @ApiOkResponse({ type: PresignAssetResponseDto })
  async presign(@Req() req: Request, @Body() dto: PresignAssetDto) {
    const userId = (req.user as { userId: string }).userId;
    const purpose = dto.purpose ?? 'CUSTOM_DESIGN_ASSET';

    if (!this.allowedPresignPurposes.includes(purpose)) {
      throw new BadRequestException(`Purpose ${purpose} is not allowed for customer uploads`);
    }

    return this.assetsService.presign(userId, dto.filename, dto.mimeType, purpose, dto.size);
  }

  @Post('upload-custom')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        customDesignId: { type: 'string' },
      },
    },
  })
  @ApiOkResponse({ type: AssetResponseDto })
  @UseInterceptors(FileInterceptor('file'))
  async uploadCustom(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.assetsService.upload(userId, file, 'CUSTOM_DESIGN_ASSET');
  }

  @Post('upload-review')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOkResponse({ type: AssetResponseDto })
  @UseInterceptors(FileInterceptor('file'))
  async uploadReview(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.assetsService.upload(userId, file, 'REVIEW_IMAGE');
  }
}
