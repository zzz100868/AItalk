import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MatchService } from './match.service';
import { WxSubscribeService } from '../notifications/wx-subscribe.service';

@Injectable()
export class MatchScheduler {
  private readonly logger = new Logger(MatchScheduler.name);

  constructor(
    private readonly matchService: MatchService,
    private readonly prisma: PrismaService,
    private readonly wxSubscribe: WxSubscribeService,
  ) {}

  @Cron('0 0 * * 2')
  async handleWeeklyMatch() {
    this.logger.log('Weekly match cron triggered');
    await this.matchService.executeMatchRound();
    await this.sendMatchPushNotifications();
  }

  private async sendMatchPushNotifications() {
    try {
      // get the latest published round
      const round = await this.prisma.matchRound.findFirst({
        where: { status: 'published' },
        orderBy: { scheduledAt: 'desc' },
        include: {
          results: {
            include: { userA: true, userB: true },
          },
        },
      });

      if (!round || round.results.length === 0) {
        this.logger.log('No match results to notify');
        return;
      }

      const users: { openid: string; matchName: string }[] = [];
      for (const result of round.results) {
        if (result.userA.openid && !result.userA.openid.startsWith('mock_')) {
          users.push({ openid: result.userA.openid, matchName: result.userB.nickname });
        }
        if (result.userB.openid && !result.userB.openid.startsWith('mock_')) {
          users.push({ openid: result.userB.openid, matchName: result.userA.nickname });
        }
      }

      if (users.length > 0) {
        await this.wxSubscribe.sendMatchNotifications(users);
      }
    } catch (e) {
      this.logger.error(`Push notification error: ${e.message}`);
    }
  }
}
