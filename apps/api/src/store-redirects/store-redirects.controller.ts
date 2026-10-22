import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { StoreRedirectsService } from './store-redirects.service';

@ApiTags('store-redirects')
@Controller('store-redirects')
export class StoreRedirectsController {
  constructor(private readonly storeRedirectsService: StoreRedirectsService) {}

  @Get()
  @ApiOkResponse()
  findActive() {
    return this.storeRedirectsService.findActive();
  }
}
