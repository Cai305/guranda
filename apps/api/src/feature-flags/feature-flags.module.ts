import { Module } from '@nestjs/common';
import {
  FeatureFlagsController,
  AdminFeatureFlagsController,
} from './feature-flags.controller';
import { FeatureFlagsService } from './feature-flags.service';
import { SettingsFlagsAiToolsProvider } from './settings-flags-ai-tools.provider';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [AdminModule],
  controllers: [FeatureFlagsController, AdminFeatureFlagsController],
  providers: [FeatureFlagsService, SettingsFlagsAiToolsProvider],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {}
