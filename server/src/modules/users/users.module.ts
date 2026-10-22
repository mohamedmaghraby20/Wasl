import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { AuthModule } from '../auth/auth.module';
import { UsersController } from './users.controller';
import { SUPABASE_STORAGE_CLIENT, UsersService } from './users.service';

const SUPABASE_PUBLIC_URL = 'SUPABASE_PUBLIC_URL';

@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: SUPABASE_PUBLIC_URL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => config.get<string>('SUPABASE_URL'),
    },
    {
      provide: SUPABASE_STORAGE_CLIENT,
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
})
export class UsersModule {}
