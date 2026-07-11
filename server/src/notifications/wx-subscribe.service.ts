import { Injectable, Logger } from '@nestjs/common';

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

const WX_TOKEN_URL = 'https://api.weixin.qq.com/cgi-bin/token';
const WX_SUBSCRIBE_URL = 'https://api.weixin.qq.com/cgi-bin/message/subscribe/send';

@Injectable()
export class WxSubscribeService {
  private readonly logger = new Logger(WxSubscribeService.name);
  private tokenCache: CachedToken | null = null;

  /**
   * Send match result notifications to matched users.
   * Silently ignores all failures — push is best-effort, not guaranteed.
   */
  async sendMatchNotifications(users: { openid: string; matchName: string }[]) {
    const templateId = process.env.WX_SUBSCRIBE_TMPL_ID;
    if (!templateId) {
      this.logger.warn('WX_SUBSCRIBE_TMPL_ID not configured — skipping push');
      return;
    }

    const token = await this.getAccessToken();
    if (!token) {
      this.logger.warn('Cannot get WeChat access_token — skipping push');
      return;
    }

    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:00`;

    for (const user of users) {
      try {
        const resp = await fetch(`${WX_SUBSCRIBE_URL}?access_token=${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            touser: user.openid,
            template_id: templateId,
            page: 'pages/match/match',
            data: {
              thing1: { value: '你的本周缘分已揭晓' },
              time2: { value: timeStr },
              thing3: { value: `快来看看 ${user.matchName} 是否是你的灵魂伴侣` },
            },
            miniprogram_state: 'developer', // 'formal' for production
          }),
        });

        const body = await resp.json();
        if ((body as any).errcode !== 0) {
          this.logger.warn(`Subscribe message failed for ${user.openid}: ${JSON.stringify(body)}`);
        }
      } catch (e) {
        // silently ignore push failures
        this.logger.debug(`Push error for ${user.openid}: ${e.message}`);
      }
    }

    this.logger.log(`Sent ${users.length} match notifications`);
  }

  private async getAccessToken(): Promise<string | null> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt - 60000) {
      return this.tokenCache.accessToken;
    }

    const appId = process.env.WX_APPID;
    const secret = process.env.WX_SECRET;

    if (!appId || !secret || appId === 'wx_your_appid') {
      this.logger.warn('WX_APPID / WX_SECRET not configured');
      return null;
    }

    try {
      const resp = await fetch(`${WX_TOKEN_URL}?grant_type=client_credential&appid=${appId}&secret=${secret}`);
      const data = await resp.json() as any;
      if (data.access_token) {
        this.tokenCache = {
          accessToken: data.access_token,
          expiresAt: Date.now() + (data.expires_in || 7200) * 1000,
        };
        return this.tokenCache.accessToken;
      }
      this.logger.error(`Failed to get access_token: ${JSON.stringify(data)}`);
      return null;
    } catch (e) {
      this.logger.error(`access_token fetch error: ${e.message}`);
      return null;
    }
  }
}
