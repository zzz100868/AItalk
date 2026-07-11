import { Module } from '@nestjs/common';
import { PayController } from './pay.controller';
import { PayService } from './pay.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [PayController],
  providers: [PayService],
})
export class PayModule {}
