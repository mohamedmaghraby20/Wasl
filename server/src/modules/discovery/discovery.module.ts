import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ReferenceDataRepository } from './reference-data.repository';
import { DiscoveryController } from './discovery.controller';

@Module({
  imports: [AuthModule],
  controllers: [DiscoveryController],
  providers: [ReferenceDataRepository],
  exports: [ReferenceDataRepository],
})
export class DiscoveryModule {}
