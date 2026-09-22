import {
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
import { Request } from 'express';

import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permission } from '../auth/permissions';
import { AssetsService } from './assets.service';
import { AssetResponseDto } from './dto/asset-response.dto';
import { CreateExternalAssetDto } from './dto/create-external-asset.dto';
import { PresignAssetDto } from './dto/presign-asset.dto';
import { PresignAssetResponseDto } from './dto/presign-asset-response.dto';

@ApiTags('admin-assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post('upload')
  @RequirePermission(Permission.ASSETS_WRITE)
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
  async upload(@Req() req: Request, @UploadedFile() file: Express.Multer.File) {
    const userId = (req.user as { userId: string }).userId;
    return this.assetsService.upload(userId, file);
  }

  @Post('external')
  @RequirePermission(Permission.ASSETS_WRITE)
  @ApiOkResponse({ type: AssetResponseDto })
  async createExternal(@Req() req: Request, @Body() dto: CreateExternalAssetDto) {
    const userId = (req.user as { userId: string }).userId;
    return this.assetsService.createExternal(userId, dto.url);
  }

  @Post('presign')
  @RequirePermission(Permission.ASSETS_WRITE)
  @ApiOkResponse({ type: PresignAssetResponseDto })
  async presign(@Req() req: Request, @Body() dto: PresignAssetDto) {
    const userId = (req.user as { userId: string }).userId;
    return this.assetsService.presign(userId, dto.filename, dto.mimeType, dto.purpose, dto.size);
  }
}
