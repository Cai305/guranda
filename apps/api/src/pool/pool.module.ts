import { Module } from '@nestjs/common';
import { PoolController } from './pool.controller';
import { PoolService } from './pool.service';
import { PoolGateway } from './pool.gateway';
import { PrismaService } from '../prisma.service';
import { PoolAiToolsProvider } from './pool-ai-tools.provider';

@Module({
  controllers: [PoolController],
  providers: [PoolService, PoolGateway, PrismaService, PoolAiToolsProvider],
})
export class PoolModule {}
