import { Controller, Get, Post, Param, Body, UseGuards, HttpCode } from '@nestjs/common';
import { MatchService } from './match.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, JwtPayload } from '../auth/current-user.decorator';

@Controller('match')
@UseGuards(AuthGuard)
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @Get('current')
  getCurrent(@CurrentUser() user: JwtPayload) {
    return this.matchService.getCurrentMatch(user.sub);
  }

  @Post('do')
  doMatch(@CurrentUser() user: JwtPayload) {
    return this.matchService.doMatch(user.sub);
  }

  @Post(':id/feedback')
  @HttpCode(204)
  feedback(
    @CurrentUser() user: JwtPayload,
    @Param('id') matchId: string,
    @Body() body: { sentiment: string; skipReason?: string; comments?: string },
  ) {
    return this.matchService.submitFeedback(user.sub, matchId, body);
  }
}
