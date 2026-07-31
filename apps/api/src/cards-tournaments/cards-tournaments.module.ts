import { Module, forwardRef } from '@nestjs/common';
import { CardsTournamentsController } from './cards-tournaments.controller';
import { CardsTournamentsService } from './cards-tournaments.service';
import { PrismaService } from '../prisma.service';
import { CardsModule } from '../cards/cards.module';

@Module({
  imports: [forwardRef(() => CardsModule)],
  controllers: [CardsTournamentsController],
  providers: [CardsTournamentsService, PrismaService],
  exports: [CardsTournamentsService],
})
export class CardsTournamentsModule {}
