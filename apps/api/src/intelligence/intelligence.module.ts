import { Module } from '@nestjs/common';
import { IntelligenceService } from './intelligence.service';
import { IntelligenceAdminController } from './intelligence-admin.controller';
import { PrismaService } from '../prisma.service';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [AdminModule],
  controllers: [IntelligenceAdminController],
  providers: [IntelligenceService, PrismaService],
  exports: [IntelligenceService],
})
export class IntelligenceModule {}
