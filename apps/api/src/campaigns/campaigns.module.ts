import { Module } from '@nestjs/common';
import { CampaignsController } from './campaigns.controller';
import { CampaignsAdminController } from './campaigns-admin.controller';
import { CampaignsService } from './campaigns.service';
import { AdminModule } from '../admin/admin.module';
import { FranchisesModule } from '../franchises/franchises.module';

@Module({
  imports: [AdminModule, FranchisesModule],
  controllers: [CampaignsController, CampaignsAdminController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
