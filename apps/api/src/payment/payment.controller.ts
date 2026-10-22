import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentService } from './payment.service';

class CheckoutSessionResponseDto {
  @ApiProperty()
  url!: string;
}

class ActiveProviderResponseDto {
  @ApiProperty({ example: 'bold' })
  provider!: string;

  @ApiProperty({ description: 'true si el proveedor soporta botón de pagos embebido' })
  supportsButton!: boolean;
}

class BoldButtonConfigResponseDto {
  @ApiProperty()
  apiKey!: string;

  @ApiProperty()
  orderId!: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  currency!: string;

  @ApiProperty({ description: 'Hash SHA256(orderId + amount + currency + secret)' })
  integritySignature!: string;

  @ApiProperty()
  redirectionUrl!: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  sandbox!: boolean;
}

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('active-provider')
  @ApiOperation({ summary: 'Proveedor de pagos activo (stripe | bold)' })
  @ApiOkResponse({ type: ActiveProviderResponseDto })
  activeProvider() {
    return this.paymentService.getActiveProviderInfo();
  }

  @Post('create-checkout-session/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a checkout session (link de pago) for an order' })
  @ApiOkResponse({ type: CheckoutSessionResponseDto })
  async createCheckoutSession(@Param('orderId') orderId: string, @Req() req: Request) {
    const user = req.user as { userId: string };
    const { url } = await this.paymentService.createCheckoutSession(orderId, user.userId);
    return { url };
  }

  @Get('button-checkout/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Config del botón de pagos embebido (Bold) para una orden' })
  @ApiOkResponse({ type: BoldButtonConfigResponseDto })
  buttonCheckout(@Param('orderId') orderId: string, @Req() req: Request) {
    const user = req.user as { userId: string };
    return this.paymentService.getButtonCheckout(orderId, user.userId);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ) {
    const rawBody = req.rawBody ?? req.body;
    const payload = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody));
    return this.paymentService.handleWebhook(payload, signature);
  }

  @Post('webhook/bold')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bold webhook endpoint (firma x-bold-signature)' })
  async boldWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-bold-signature') signature: string | undefined,
  ) {
    const rawBody = req.rawBody ?? req.body;
    const payload = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody));
    return this.paymentService.handleWebhook(payload, signature);
  }
}
