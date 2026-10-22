import { Global, Module } from '@nestjs/common';

import { CorsPolicyService } from './cors-policy.service';

@Global()
@Module({
  providers: [CorsPolicyService],
  exports: [CorsPolicyService],
})
export class CorsPolicyModule {}
