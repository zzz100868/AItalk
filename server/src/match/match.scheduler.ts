import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MatchService } from './match.service';

@Injectable()
export class MatchScheduler {
  private readonly logger = new Logger(MatchScheduler.name);

  constructor(private readonly matchService: MatchService) {}

  @Cron('0 0 * * 2')
  async handleWeeklyMatch() {
    this.logger.log('Weekly match cron triggered');
    await this.matchService.executeMatchRound();
  }
}
