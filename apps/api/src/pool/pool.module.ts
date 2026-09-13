import { Module } from '@nestjs/common';
import { PoolController } from './pool.controller';
import { PoolService } from './pool.service';
import { PoolGateway } from './pool.gateway';
import { PoolAiToolsProvider } from './pool-ai-tools.provider';

@Module({
  controllers: [PoolController],
  providers: [PoolService, PoolGateway, PoolAiToolsProvider],
})
export class PoolModule {}
