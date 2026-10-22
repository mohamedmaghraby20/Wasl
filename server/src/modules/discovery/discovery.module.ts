import { Module } from '@nestjs/common';
import { ReferenceDataRepository } from './reference-data.repository';
import { DiscoveryController } from './discovery.controller';

@Module({ controllers: [DiscoveryController], providers: [ReferenceDataRepository], exports: [ReferenceDataRepository] })
export class DiscoveryModule {}
