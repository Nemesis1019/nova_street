import { Module } from '@nestjs/common';

import { AdminDesignTemplatesController } from './admin-design-templates.controller';
import { DesignTemplatesController } from './design-templates.controller';
import { DesignTemplatesService } from './design-templates.service';

@Module({
  controllers: [DesignTemplatesController, AdminDesignTemplatesController],
  providers: [DesignTemplatesService],
  exports: [DesignTemplatesService],
})
export class DesignTemplatesModule {}
