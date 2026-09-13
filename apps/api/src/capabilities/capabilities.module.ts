import { Module } from '@nestjs/common';
import { CapabilityGrantService } from './capability-grant.service';
import { CapabilityManifestService } from './capability-manifest.service';
import { CapabilitiesController } from './capabilities.controller';

@Module({
  controllers: [CapabilitiesController],
  providers: [CapabilityGrantService, CapabilityManifestService],
  exports: [CapabilityGrantService, CapabilityManifestService],
})
export class CapabilitiesModule {}
