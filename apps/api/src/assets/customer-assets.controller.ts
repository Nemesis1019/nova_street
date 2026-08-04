import {
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

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AssetsService } from './assets.service';
import { AssetResponseDto } from './dto/asset-response.dto';

@ApiTags('assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assets')
export class CustomerAssetsController {
  constructor(private readonly assetsService: AssetsService) {}

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
