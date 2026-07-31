import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { GifService } from './gif.service';

@Controller('gifs')
@UseGuards(JwtAuthGuard)
export class GifController {
  constructor(private gifService: GifService) {}

  @Get('search')
  async search(@Query('q') q: string) {
    return this.gifService.search(q);
  }
}
