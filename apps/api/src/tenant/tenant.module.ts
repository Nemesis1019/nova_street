import { Global, Module } from '@nestjs/common';

import { MasterPrismaService } from '../prisma/master-prisma.service';
import { TenantMiddleware } from './tenant.middleware';
import { TenantContextService } from './tenant-context.service';
import { TenantPrismaFactory } from './tenant-prisma.factory';
import { TenantRegistryService } from './tenant-registry.service';
import { TenantShadowUserService } from './tenant-shadow-user.service';

@Global()
@Module({
  providers: [
    MasterPrismaService,
    TenantContextService,
    TenantRegistryService,
    TenantPrismaFactory,
    TenantShadowUserService,
    TenantMiddleware,
  ],
  exports: [
    MasterPrismaService,
    TenantContextService,
    TenantRegistryService,
    TenantPrismaFactory,
    TenantShadowUserService,
    TenantMiddleware,
  ],
})
export class TenantModule {}
