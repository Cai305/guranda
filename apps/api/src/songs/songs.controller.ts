import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { SongsService } from './songs.service';
import { CreateSongDto } from './dto/create-song.dto';

@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@Controller('songs')
@UseGuards(JwtAuthGuard)
export class SongsController {
  constructor(private readonly songsService: SongsService) {}

  @Post()
  async upload(@Request() req: any, @Body() body: CreateSongDto) {
    return this.songsService.uploadSong(req.user.userId, body);
  }

  @Get()
  async list(@Request() req: any, @Query('mine') mine?: string, @Query('query') query?: string) {
    return this.songsService.listSongs(req.user.userId, { mine: mine === 'true', query });
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.songsService.getSong(id);
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.songsService.deleteSong(req.user.userId, id);
  }
}
