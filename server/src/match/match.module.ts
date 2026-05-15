import { Module } from '@nestjs/common';
import { MatchController } from './match.controller';
import { MatchService } from './match.service';
import { MatchScheduler } from './match.scheduler';

@Module({
  controllers: [MatchController],
  providers: [MatchService, MatchScheduler],
  exports: [MatchService],
})
export class MatchModule {}
