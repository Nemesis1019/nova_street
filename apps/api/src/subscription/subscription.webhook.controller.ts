import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { SubscriptionService } from './subscription.service';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionWebhookController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post('webhook/bold')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook Bold para confirmar pagos de suscripción' })
  boldWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-bold-signature') signature: string | undefined,
  ) {
    const rawBody = req.rawBody ?? req.body;
    const payload = Buffer.isBuffer(rawBody)
      ? rawBody
      : Buffer.from(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody));

    if (!payload.length) {
      throw new BadRequestException('Empty Bold payload');
    }

    return this.subscriptionService.handleBoldWebhook(payload, signature);
  }
}
