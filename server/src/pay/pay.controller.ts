import { Controller, Post, Body, Headers, HttpCode, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, JwtPayload } from '../auth/current-user.decorator';
import { PayService } from './pay.service';

@Controller('pay')
export class PayController {
  constructor(private readonly payService: PayService) {}

  @Post('create-order')
  @UseGuards(AuthGuard)
  createOrder(@CurrentUser() user: JwtPayload, @Body() body: { sku: string; targetMatchId: string }) {
    return this.payService.createOrder({
      userId: user.sub,
      sku: body.sku || 'unlock_wechat',
      targetMatchId: body.targetMatchId,
    });
  }

  @Post('wx-callback')
  @HttpCode(200)
  wxCallback(@Body() body: any, @Headers() headers: Record<string, string>) {
    return this.payService.handleCallback(body, headers);
  }
}
