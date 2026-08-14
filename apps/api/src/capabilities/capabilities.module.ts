import { Module } from '@nestjs/common';
import { CapabilityGrantService } from './capability-grant.service';
import { CapabilityManifestService } from './capability-manifest.service';
import { CapabilitiesController } from './capabilities.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [CapabilitiesController],
  providers: [CapabilityGrantService, CapabilityManifestService, PrismaService],
  exports: [CapabilityGrantService, CapabilityManifestService],
})
export class CapabilitiesModule {}
