import { Module } from '@nestjs/common';
import { MatchController } from './match.controller';
import { MatchService } from './match.service';
import { MatchScheduler } from './match.scheduler';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [MatchController],
  providers: [MatchService, MatchScheduler],
  exports: [MatchService],
})
export class MatchModule {}
