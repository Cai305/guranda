import { Module } from '@nestjs/common';
import { TrustSafetyService } from './trust-safety.service';
import { TrustSafetyAdminController } from './trust-safety-admin.controller';
import { PrismaService } from '../prisma.service';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [AdminModule],
  controllers: [TrustSafetyAdminController],
  providers: [TrustSafetyService, PrismaService],
  exports: [TrustSafetyService],
})
export class TrustSafetyModule {}
