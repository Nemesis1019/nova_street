import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permission } from '../auth/permissions';
import { BackupService } from './backup.service';

@ApiTags('admin-backup')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/backups')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post('trigger')
  @RequirePermission(Permission.BACKUPS_WRITE)
  trigger() {
    return this.backupService.runBackup();
  }
}
