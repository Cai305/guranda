import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { MurabarabaService } from './murabaraba.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('murabaraba')
@UseGuards(JwtAuthGuard)
export class MurabarabaController {
  constructor(private readonly murabarabaService: MurabarabaService) {}

  @Get(':id')
  async getGame(@Param('id') id: string) {
    return this.murabarabaService.getGame(id);
  }
}
