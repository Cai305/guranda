import { Module } from '@nestjs/common';
import { LudoService } from './ludo.service';
import { LudoGateway } from './ludo.gateway';
import { LudoController } from './ludo.controller';
import { PrismaService } from '../prisma.service';
import { LudoAiToolsProvider } from './ludo-ai-tools.provider';

@Module({
  controllers: [LudoController],
  providers: [LudoService, LudoGateway, PrismaService, LudoAiToolsProvider],
})
export class LudoModule {}
