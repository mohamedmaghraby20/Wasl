import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrganizationsController } from './organizations.controller';
import {
  ORGANIZATION_STORAGE_CLIENT,
  ORGANIZATION_SUPABASE_URL,
  OrganizationsService,
} from './organizations.service';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [OrganizationsController],
  providers: [
    OrganizationsService,
    {
      provide: ORGANIZATION_SUPABASE_URL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => config.get<string>('SUPABASE_URL'),
    },
    {
      provide: ORGANIZATION_STORAGE_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('SUPABASE_URL');
        const key =
          config.get<string>('SUPABASE_SECRET_KEY') ??
          config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
        if (!url || !key) return undefined;
        return createClient(url, key, {
          auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
        });
      },
    },
  ],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
