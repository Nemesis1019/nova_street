import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permission } from '../auth/permissions';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ReviewStorefrontApprovalDto } from './dto/review-storefront-approval.dto';
import { SaveStorefrontDraftDto } from './dto/save-storefront-draft.dto';
import { SaveStorefrontPresetDto } from './dto/save-storefront-preset.dto';
import { SetStorefrontApprovalDto } from './dto/set-storefront-approval.dto';
import { StorefrontService } from './storefront.service';

@ApiTags('admin-storefront')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/storefront')
export class AdminStorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Get()
  @RequirePermission(Permission.STORE_CONFIG_READ)
  state(@Req() req: Request) {
    return this.storefrontService.getAdminState(this.actor(req));
  }

  @Get('presets')
  @RequirePermission(Permission.STORE_CONFIG_READ)
  presets(@Req() req: Request) {
    return this.storefrontService
      .getAdminState(this.actor(req))
      .then((state) => state.presets);
  }

  @Get('experiments/:id/results')
  @RequirePermission(Permission.STORE_CONFIG_READ)
  experimentResults(@Param('id') id: string) {
    return this.storefrontService.getExperimentResults(id);
  }

  @Put('draft')
  @RequirePermission(Permission.STORE_CONFIG_WRITE)
  saveDraft(@Req() req: Request, @Body() dto: SaveStorefrontDraftDto) {
    return this.storefrontService.saveDraft(dto.doc, this.userId(req), this.actor(req));
  }

  @Post('publish')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Permission.STORE_CONFIG_WRITE)
  publish(@Req() req: Request) {
    return this.storefrontService.publish(this.userId(req), this.actor(req));
  }

  @Patch('approval')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Permission.STORE_CONFIG_WRITE)
  setApprovalRequired(@Req() req: Request, @Body() dto: SetStorefrontApprovalDto) {
    return this.storefrontService.setApprovalRequired(
      dto.required,
      this.userId(req),
      this.actor(req),
    );
  }

  @Post('approval/submit')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Permission.STORE_CONFIG_WRITE)
  submitApproval(@Req() req: Request) {
    return this.storefrontService.submitForApproval(this.userId(req), this.actor(req));
  }

  @Post('approval/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Permission.STORE_CONFIG_WRITE)
  approve(@Req() req: Request, @Body() dto: ReviewStorefrontApprovalDto) {
    return this.storefrontService.approveForApproval(
      dto.note,
      this.userId(req),
      this.actor(req),
    );
  }

  @Post('approval/reject')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Permission.STORE_CONFIG_WRITE)
  reject(@Req() req: Request, @Body() dto: ReviewStorefrontApprovalDto) {
    return this.storefrontService.rejectForApproval(
      dto.note,
      this.userId(req),
      this.actor(req),
    );
  }

  @Post('presets')
  @RequirePermission(Permission.STORE_CONFIG_WRITE)
  savePreset(@Req() req: Request, @Body() dto: SaveStorefrontPresetDto) {
    return this.storefrontService.saveCustomPreset(
      dto.name,
      dto.description,
      this.userId(req),
      this.actor(req),
    );
  }

  @Delete('presets/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Permission.STORE_CONFIG_WRITE)
  deletePreset(@Req() req: Request, @Param('id') id: string) {
    return this.storefrontService.deleteCustomPreset(id, this.userId(req), this.actor(req));
  }

  @Post('presets/:key/apply')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Permission.STORE_CONFIG_WRITE)
  applyPreset(@Req() req: Request, @Param('key') key: string) {
    return this.storefrontService.applyPreset(key, this.userId(req), this.actor(req));
  }

  @Get('versions')
  @RequirePermission(Permission.STORE_CONFIG_READ)
  versions() {
    return this.storefrontService.getVersions();
  }

  @Post('versions/:id/restore')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Permission.STORE_CONFIG_WRITE)
  restore(@Req() req: Request, @Param('id') id: string) {
    return this.storefrontService.restoreVersion(id, this.userId(req), this.actor(req));
  }

  @Post('preview-token')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Permission.STORE_CONFIG_READ)
  previewToken(@Req() req: Request) {
    return this.storefrontService.createPreviewToken(this.userId(req));
  }

  private userId(req: Request): string {
    return (req.user as AuthenticatedUser).userId;
  }

  private actor(req: Request): AuthenticatedUser {
    return req.user as AuthenticatedUser;
  }
}
