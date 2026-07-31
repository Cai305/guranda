import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { LudoService } from './ludo.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('ludo')
@UseGuards(JwtAuthGuard)
export class LudoController {
  constructor(private readonly ludoService: LudoService) {}

  @Get(':id')
  async getGame(@Param('id') id: string) {
    return this.ludoService.getGame(id);
  }
}
