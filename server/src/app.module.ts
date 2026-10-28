import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnvironment } from './config/env';
import { HealthModule } from './common/health/health.module';
import { DatabaseModule } from './db/database.module';
import { DiscoveryModule } from './modules/discovery/discovery.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CommunitiesModule } from './modules/communities/communities.module';
import { EventsModule } from './modules/events/events.module';
import { ParticipationModule } from './modules/participation/participation.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { DiscussionsModule } from './modules/discussions/discussions.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ModerationModule } from './modules/moderation/moderation.module';
import { PrivacyModule } from './modules/privacy/privacy.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    DatabaseModule,
    AuthModule,
    UsersModule,
    CommunitiesModule,
    EventsModule,
    ParticipationModule,
    OrganizationsModule,
    DiscussionsModule,
    MessagingModule,
    NotificationsModule,
    ModerationModule,
    PrivacyModule,
    DiscoveryModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
