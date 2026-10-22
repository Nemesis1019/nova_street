import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permission } from '../auth/permissions';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { PreviewEmailTemplateDto } from './dto/preview-email-template.dto';
import { TestEmailTemplateDto } from './dto/test-email-template.dto';
import { UpsertEmailTemplateDto } from './dto/upsert-email-template.dto';
import { EmailService } from './email.service';
import { EmailTemplatesService } from './email-templates.service';

@ApiTags('admin-email-templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/email-templates')
export class EmailTemplatesController {
  constructor(
    private readonly emailTemplatesService: EmailTemplatesService,
    private readonly emailService: EmailService,
  ) {}

  @Get()
  @RequirePermission(Permission.EMAIL_TEMPLATES_READ)
  findAll() {
    return this.emailTemplatesService.findAll();
  }

  @Post()
  @RequirePermission(Permission.EMAIL_TEMPLATES_WRITE)
  create(@Body() dto: CreateEmailTemplateDto) {
    return this.emailTemplatesService.create(dto);
  }

  @Get(':key')
  @RequirePermission(Permission.EMAIL_TEMPLATES_READ)
  findOne(@Param('key') key: string) {
    return this.emailTemplatesService.findOne(key);
  }

  @Put(':key')
  @RequirePermission(Permission.EMAIL_TEMPLATES_WRITE)
  upsert(@Param('key') key: string, @Body() dto: UpsertEmailTemplateDto) {
    return this.emailTemplatesService.upsert(key, dto);
  }

  @Post(':key/reset')
  @RequirePermission(Permission.EMAIL_TEMPLATES_WRITE)
  reset(@Param('key') key: string) {
    return this.emailTemplatesService.reset(key);
  }

  @Post(':key/preview')
  @RequirePermission(Permission.EMAIL_TEMPLATES_READ)
  preview(@Param('key') key: string, @Body() dto: PreviewEmailTemplateDto) {
    return this.emailTemplatesService.preview(key, dto);
  }

  @Post(':key/test')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(Permission.EMAIL_TEMPLATES_WRITE)
  async sendTest(@Param('key') key: string, @Body() dto: TestEmailTemplateDto) {
    await this.emailService.sendTemplateTest(key, dto.to);
    return { sent: true, to: dto.to };
  }
}
