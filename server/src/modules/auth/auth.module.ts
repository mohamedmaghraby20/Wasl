import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { PlatformAdminGuard } from './platform-admin.guard';
import { PrivacyGateService } from './privacy-gate.service';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { SUPABASE_AUTH_CLIENT, SupabaseAuthService } from './supabase-auth.service';
import { SupabaseIdentityService } from './supabase-identity.service';

@Module({
  providers: [
    {
      provide: SUPABASE_AUTH_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('SUPABASE_URL');
        const key = config.get<string>('SUPABASE_PUBLISHABLE_KEY');
        if (!url || !key) return undefined;
        return createClient(url, key, {
          auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
        });
      },
    },
    {
      provide: SupabaseAuthService,
      inject: [SUPABASE_AUTH_CLIENT],
      useFactory: (client: ConstructorParameters<typeof SupabaseAuthService>[0]) =>
        new SupabaseAuthService(client),
    },
    SupabaseIdentityService,
    PrivacyGateService,
    SupabaseAuthGuard,
    PlatformAdminGuard,
  ],
  exports: [
    SupabaseAuthGuard,
    SupabaseAuthService,
    SupabaseIdentityService,
    PrivacyGateService,
    PlatformAdminGuard,
  ],
})
export class AuthModule {}
