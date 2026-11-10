import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RecordExperimentEventDto } from './dto/record-experiment-event.dto';
import { StorefrontService } from './storefront.service';

@ApiTags('storefront')
@Controller('storefront')
export class StorefrontController {
  constructor(private readonly storefrontService: StorefrontService) {}

  @Get('preview')
  @ApiOperation({ summary: 'Get the draft storefront document using a signed preview token' })
  @ApiOkResponse()
  async preview(@Query('token') token?: string) {
    if (!token) throw new BadRequestException('Falta el token de preview');
    return this.storefrontService.getPreviewDocument(token);
  }

  @Post('experiment-event')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Record an anonymous storefront experiment impression or click' })
  async experimentEvent(@Body() dto: RecordExperimentEventDto) {
    return this.storefrontService.recordExperimentEvent(dto);
  }
}
