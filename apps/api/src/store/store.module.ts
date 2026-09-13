import { Module } from '@nestjs/common';
import { StoreService } from './store.service';
import { StoreController } from './store.controller';
import { MiniAppsAiToolsProvider } from './miniapps-ai-tools.provider';

@Module({
  providers: [StoreService, MiniAppsAiToolsProvider],
  controllers: [StoreController],
  exports: [StoreService],
})
export class StoreModule {}
