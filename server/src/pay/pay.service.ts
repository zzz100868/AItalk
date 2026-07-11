import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as crypto from 'crypto';
import * as fs from 'fs';

interface CreateOrderParams {
  userId: string;
  sku: string;
  targetMatchId: string;
}

export interface WxPayParams {
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: string;
  paySign: string;
}

const WX_PAY_JSAPI = 'https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi';

@Injectable()
export class PayService {
  private readonly logger = new Logger(PayService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // ============ Public API ============

  async createOrder(params: CreateOrderParams) {
    const { userId, sku, targetMatchId } = params;

    const matchResult = await this.prisma.matchResult.findFirst({
      where: {
        id: targetMatchId,
        OR: [{ userAId: userId }, { userBId: userId }],
      },
    });
    if (!matchResult) {
      return { success: false, error: 'MATCH_NOT_FOUND', message: '匹配结果不存在' };
    }

    const existing = await this.prisma.order.findFirst({
      where: { userId, targetMatchId, status: 'paid' },
    });
    if (existing) {
      return { success: false, error: 'ALREADY_PAID', message: '已解锁该用户' };
    }

    const outTradeNo = `CB${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
    const amount = 699; // 6.99 CNY

    const order = await this.prisma.order.create({
      data: {
        userId,
        sku,
        targetMatchId,
        amount,
        status: 'pending',
        wxOutTradeNo: outTradeNo,
      },
    });

    if (!process.env.WX_MCH_ID) {
      this.logger.warn('WeChat Pay not configured — returning mock order');
      return { success: true, orderId: order.id, wxPayParams: null };
    }

    try {
      const wxPayParams = await this.callWxUnifiedOrder(order.id, outTradeNo, amount, userId);
      return { success: true, orderId: order.id, wxPayParams };
    } catch (e) {
      this.logger.error(`Create order failed: ${e.message}`);
      await this.prisma.order.update({ where: { id: order.id }, data: { status: 'failed' } });
      return { success: false, error: 'PAY_FAILED', message: '下单失败，请稍后重试' };
    }
  }

  async handleCallback(body: any, headers: Record<string, string>) {
    if (!process.env.WX_MCH_ID) {
      this.logger.warn('WeChat Pay not configured — skipping callback');
      return { code: 'SUCCESS', message: 'ok' };
    }

    try {
      const signature = headers['wechatpay-signature'];
      const nonce = headers['wechatpay-nonce'];
      const timestamp = headers['wechatpay-timestamp'];

      if (!signature || !nonce || !timestamp) {
        this.logger.error('Missing callback signature headers');
        return { code: 'FAIL', message: 'missing signature headers' };
      }

      const bodyStr = JSON.stringify(body);
      const ok = this.verifyWxSignature(timestamp, nonce, bodyStr, signature);
      if (!ok) {
        this.logger.error('Callback signature verification failed');
        return { code: 'FAIL', message: 'signature mismatch' };
      }

      const resource = body.resource;
      if (!resource?.ciphertext) {
        return { code: 'FAIL', message: 'missing ciphertext' };
      }

      const decrypted = this.decryptResource(
        resource.ciphertext,
        resource.associated_data || '',
        resource.nonce,
      );
      const notify: any = JSON.parse(decrypted);

      const outTradeNo = notify.out_trade_no;
      const transactionId = notify.transaction_id;

      const order = await this.prisma.order.findFirst({
        where: { wxOutTradeNo: outTradeNo },
        include: { matchResult: { include: { userA: true, userB: true } } },
      });

      if (!order) {
        this.logger.error(`Order not found for out_trade_no: ${outTradeNo}`);
        return { code: 'FAIL', message: 'order not found' };
      }

      if (order.status === 'paid') {
        return { code: 'SUCCESS', message: 'ok' };
      }

      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'paid', wxTransactionId: transactionId, paidAt: new Date() },
      });

      await this.prisma.entitlement.create({
        data: {
          userId: order.userId,
          type: order.sku,
          matchResultId: order.targetMatchId,
          orderId: order.id,
        },
      });

      const isUserA = order.matchResult.userAId === order.userId;
      await this.prisma.matchResult.update({
        where: { id: order.targetMatchId },
        data: isUserA ? { unlockedByA: true } : { unlockedByB: true },
      });

      const other = isUserA ? order.matchResult.userB : order.matchResult.userA;
      await this.notifications.create(
        order.userId,
        'match',
        `你已解锁 ${other.nickname} 的联系方式`,
      );

      this.logger.log(`Payment processed: order=${order.id} user=${order.userId}`);
      return { code: 'SUCCESS', message: 'ok' };
    } catch (e) {
      this.logger.error(`Callback error: ${e.message}`);
      return { code: 'FAIL', message: e.message };
    }
  }

  // ============ WeChat Pay V3 helpers ============

  private async callWxUnifiedOrder(
    orderId: string,
    outTradeNo: string,
    amount: number,
    userId: string,
  ): Promise<WxPayParams> {
    const mchId = process.env.WX_MCH_ID!;
    const appId = process.env.WX_APPID!;
    const notifyUrl = process.env.WX_PAY_NOTIFY_URL || '';

    const body = {
      appid: appId,
      mchid: mchId,
      description: '解锁联系方式',
      out_trade_no: outTradeNo,
      notify_url: notifyUrl,
      amount: { total: amount, currency: 'CNY' },
      payer: { openid: await this.getOpenid(userId) },
    };

    const bodyStr = JSON.stringify(body);
    const nonceStr = crypto.randomBytes(16).toString('hex');
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const signature = this.sign(
      'POST',
      '/v3/pay/transactions/jsapi',
      timestamp,
      nonceStr,
      bodyStr,
    );

    const serialNo = process.env.WX_MCH_SERIAL_NO || '';

    const resp = await fetch(WX_PAY_JSAPI, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `WECHATPAY2-SHA256-RSA2048 mchid="${mchId}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${serialNo}"`,
      },
      body: bodyStr,
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`WeChat Pay HTTP ${resp.status}: ${errText}`);
    }

    const data = await resp.json();
    const prepayId = (data as any).prepay_id;

    const payNonce = crypto.randomBytes(16).toString('hex');
    const payTimestamp = Math.floor(Date.now() / 1000).toString();
    const payPackage = `prepay_id=${prepayId}`;
    const paySignStr = `${appId}\n${payTimestamp}\n${payNonce}\n${payPackage}\n`;
    const paySign = crypto.createSign('RSA-SHA256').update(paySignStr).sign(this.getPrivateKey(), 'base64');

    return {
      timeStamp: payTimestamp,
      nonceStr: payNonce,
      package: payPackage,
      signType: 'RSA',
      paySign,
    };
  }

  private sign(method: string, path: string, timestamp: string, nonceStr: string, body: string): string {
    const signStr = `${method}\n${path}\n${timestamp}\n${nonceStr}\n${body}\n`;
    return crypto.createSign('RSA-SHA256').update(signStr).sign(this.getPrivateKey(), 'base64');
  }

  private verifyWxSignature(timestamp: string, nonce: string, body: string, signature: string): boolean {
    const signStr = `${timestamp}\n${nonce}\n${body}\n`;
    try {
      return crypto
        .createVerify('RSA-SHA256')
        .update(signStr)
        .verify(this.getWxPlatformCert(), signature, 'base64');
    } catch {
      return false;
    }
  }

  /**
   * Decrypt WeChat Pay V3 callback resource.
   * ciphertext = base64(AES-256-GCM(ciphertext || 16-byte-auth-tag))
   * nonce = base64(12-byte IV)
   * key = APIv3 key (32 bytes, ASCII)
   */
  private decryptResource(ciphertextB64: string, associatedData: string, nonceB64: string): string {
    const key = Buffer.from(process.env.WX_MCH_API_KEY_V3 || '', 'utf-8');
    const iv = Buffer.from(nonceB64, 'base64');
    const encrypted = Buffer.from(ciphertextB64, 'base64');

    const authTag = encrypted.subarray(encrypted.length - 16);
    const data = encrypted.subarray(0, encrypted.length - 16);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, { authTagLength: 16 }) as crypto.DecipherGCM;
    decipher.setAuthTag(authTag);
    decipher.setAAD(Buffer.from(associatedData, 'utf-8'));

    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString('utf-8');
  }

  private getPrivateKey(): Buffer {
    if (process.env.WX_MCH_PRIVATE_KEY_PATH) {
      return fs.readFileSync(process.env.WX_MCH_PRIVATE_KEY_PATH);
    }
    return Buffer.from(process.env.WX_MCH_PRIVATE_KEY || '', 'utf-8');
  }

  private getWxPlatformCert(): Buffer {
    if (process.env.WX_MCH_CERT_PATH) {
      return fs.readFileSync(process.env.WX_MCH_CERT_PATH);
    }
    return Buffer.from(process.env.WX_MCH_PUBLIC_KEY || '', 'utf-8');
  }

  private async getOpenid(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user?.openid || '';
  }
}
