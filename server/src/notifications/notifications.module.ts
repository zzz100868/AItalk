import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { WxSubscribeService } from './wx-subscribe.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, WxSubscribeService],
  exports: [NotificationsService, WxSubscribeService],
})
export class NotificationsModule {}
