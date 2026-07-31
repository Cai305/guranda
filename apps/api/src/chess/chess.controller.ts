import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ChessService } from './chess.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('chess')
@UseGuards(JwtAuthGuard)
export class ChessController {
  constructor(private readonly chessService: ChessService) {}

  @Get(':id')
  async getGame(@Param('id') id: string) {
    return this.chessService.getGame(id);
  }
}
