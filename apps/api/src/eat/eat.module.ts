import { Module } from '@nestjs/common';
import { EatController } from './eat.controller';
import { EatService } from './eat.service';
import { EatAiToolsProvider } from './eat-ai-tools.provider';

@Module({
  controllers: [EatController],
  providers: [EatService, EatAiToolsProvider],
  exports: [EatService],
})
export class EatModule {}
