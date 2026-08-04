import { Body, Controller, Headers, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('webhooks')
@Controller('webhooks/payments')
export class WebhookController {
  @Post(':provider')
  @HttpCode(HttpStatus.OK)
  handleWebhook(
    @Param('provider') provider: string,
    @Body() payload: Record<string, unknown>,
    @Headers('x-signature') signature?: string,
  ) {
    // Placeholder: real providers will validate signatures and update order/payment status.
    return {
      received: true,
      provider,
      signatureReceived: Boolean(signature),
      payloadKeys: Object.keys(payload),
    };
  }
}
