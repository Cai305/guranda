import { Module } from '@nestjs/common';
import { TurboRacingService } from './turbo-racing.service';
import { TurboRacingGateway } from './turbo-racing.gateway';
import { TurboRacingController } from './turbo-racing.controller';
import { PrismaService } from '../prisma.service';
import { TurboRacingAiToolsProvider } from './turbo-racing-ai-tools.provider';

@Module({
  controllers: [TurboRacingController],
  providers: [
    TurboRacingService,
    TurboRacingGateway,
    PrismaService,
    TurboRacingAiToolsProvider,
  ],
})
export class TurboRacingModule {}
