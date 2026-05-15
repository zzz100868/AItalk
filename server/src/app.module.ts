import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { LlmModule } from './llm/llm.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { MemoryModule } from './memory/memory.module';
import { MatchModule } from './match/match.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'dev-secret',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    LlmModule,
    HealthModule,
    AuthModule,
    ProfileModule,
    MemoryModule,
    MatchModule,
    NotificationsModule,
  ],
})
export class AppModule {}
