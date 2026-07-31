import { Module } from '@nestjs/common';
import { WordBattleController } from './word-battle.controller';
import { WordBattleService } from './word-battle.service';
import { WordBattleGateway } from './word-battle.gateway';
import { PrismaService } from '../prisma.service';
import { WordBattleAiToolsProvider } from './word-battle-ai-tools.provider';

@Module({
  controllers: [WordBattleController],
  providers: [
    WordBattleService,
    WordBattleGateway,
    PrismaService,
    WordBattleAiToolsProvider,
  ],
})
export class WordBattleModule {}
