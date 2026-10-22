import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { BackupModule } from '../backup/backup.module';
import { BackupScheduler } from './backup.scheduler';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { PlatformAuditService } from './platform-audit.service';
import { PlatformAuthController } from './platform-auth.controller';
import { PlatformAuthGuard } from './platform-auth.guard';
import { PlatformAuthService } from './platform-auth.service';
import { PlatformUsersController } from './platform-users.controller';

@Module({
  imports: [AuditModule, AuthModule, BackupModule],
  controllers: [PlatformController, PlatformAuthController, PlatformUsersController],
  providers: [
    PlatformService,
    PlatformAuditService,
    PlatformAuthService,
    PlatformAuthGuard,
    BackupScheduler,
  ],
  exports: [PlatformAuthService],
})
export class PlatformModule {}
