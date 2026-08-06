import { Module } from '@nestjs/common';
import { CapabilityGrantService } from './capability-grant.service';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [CapabilityGrantService, PrismaService],
  exports: [CapabilityGrantService],
})
export class CapabilitiesModule {}
