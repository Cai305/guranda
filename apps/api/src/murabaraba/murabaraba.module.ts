import { Module } from '@nestjs/common';
import { MurabarabaService } from './murabaraba.service';
import { MurabarabaGateway } from './murabaraba.gateway';
import { MurabarabaController } from './murabaraba.controller';
import { MurabarabaAiToolsProvider } from './murabaraba-ai-tools.provider';

@Module({
  controllers: [MurabarabaController],
  providers: [
    MurabarabaService,
    MurabarabaGateway,
    MurabarabaAiToolsProvider,
  ],
})
export class MurabarabaModule {}
