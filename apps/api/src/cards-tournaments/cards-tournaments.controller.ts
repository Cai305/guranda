import { Controller, Get, Post, Param, Body, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CardsTournamentsService } from './cards-tournaments.service';
import type { CardGameMode } from '../cards/cards.service';

@Controller('cards-tournaments')
@UseGuards(JwtAuthGuard)
export class CardsTournamentsController {
  constructor(private readonly tournaments: CardsTournamentsService) {}

  @Get()
  async listOpen() {
    return this.tournaments.listOpen();
  }

  @Get(':id')
  async getTournament(@Param('id') id: string) {
    return this.tournaments.getTournament(id);
  }

  @Post()
  async create(
    @Request() req: any,
    @Body() body: { mode: CardGameMode; name: string; maxPlayers: number; entryFee?: number; prizePool?: number },
  ) {
    return this.tournaments.createTournament(
      req.user.userId,
      body.mode,
      body.name,
      body.maxPlayers,
      body.entryFee ?? 0,
      body.prizePool ?? 0,
    );
  }

  @Post(':id/register')
  async register(@Request() req: any, @Param('id') id: string) {
    return this.tournaments.register(id, req.user.userId);
  }

  @Post(':id/start')
  async start(@Request() req: any, @Param('id') id: string) {
    return this.tournaments.startTournament(id, req.user.userId);
  }
}
