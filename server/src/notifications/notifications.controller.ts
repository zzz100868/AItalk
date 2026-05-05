import { Controller, Get, Put, Delete, Query, UseGuards, HttpCode } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, JwtPayload } from '../auth/current-user.decorator';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
  ) {
    return this.notificationsService.list(user.sub, { cursor, limit: Number(limit) || 20, type });
  }

  @Put('read-all')
  @HttpCode(204)
  readAll(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.markAllRead(user.sub);
  }

  @Delete()
  @HttpCode(204)
  clearAll(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.clearAll(user.sub);
  }
}
