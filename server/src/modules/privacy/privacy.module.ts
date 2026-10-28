import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { AuthModule } from '../auth/auth.module';
import { MessagingModule } from '../messaging/messaging.module';
import { PrivacyAdminController, PrivacyController } from './privacy.controller';
import {
  PrivacyProviderActionsService,
  SUPABASE_ADMIN_CLIENT,
} from './privacy-provider-actions.service';
import { PrivacyService } from './privacy.service';

@Module({
  imports: [AuthModule, MessagingModule],
  controllers: [PrivacyController, PrivacyAdminController],
  providers: [
    PrivacyService,
    PrivacyProviderActionsService,
    {
      provide: SUPABASE_ADMIN_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('SUPABASE_URL');
        const key =
          config.get<string>('SUPABASE_SERVICE_ROLE_KEY') ??
          config.get<string>('SUPABASE_SECRET_KEY');
        if (!url || !key) return undefined;
        return createClient(url, key, {
          auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
        });
      },
    },
  ],
  exports: [PrivacyService],
})
export class PrivacyModule {}
