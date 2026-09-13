import { Module } from '@nestjs/common';
import { LudoService } from './ludo.service';
import { LudoGateway } from './ludo.gateway';
import { LudoController } from './ludo.controller';
import { LudoAiToolsProvider } from './ludo-ai-tools.provider';

@Module({
  controllers: [LudoController],
  providers: [LudoService, LudoGateway, LudoAiToolsProvider],
})
export class LudoModule {}
