import { Module } from '@nestjs/common';
import { TrustSafetyService } from './trust-safety.service';
import { TrustSafetyAdminController } from './trust-safety-admin.controller';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [AdminModule],
  controllers: [TrustSafetyAdminController],
  providers: [TrustSafetyService],
  exports: [TrustSafetyService],
})
export class TrustSafetyModule {}
