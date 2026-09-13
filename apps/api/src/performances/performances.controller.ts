import {
  Controller,
  Get,
  Post,
  Patch,
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
import { PerformancesService } from './performances.service';
import { CreatePerformanceDto } from './dto/create-performance.dto';
import { UpdatePerformanceDto, CreatePerformanceCommentDto } from './dto/update-performance.dto';

@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@Controller('performances')
@UseGuards(JwtAuthGuard)
export class PerformancesController {
  constructor(private readonly performances: PerformancesService) {}

  @Post()
  async create(@Request() req: any, @Body() body: CreatePerformanceDto) {
    return this.performances.create(req.user.userId, body);
  }

  @Get('drafts')
  async drafts(@Request() req: any) {
    return this.performances.getMyDrafts(req.user.userId);
  }

  @Get('feed')
  async feed(@Request() req: any, @Query('cursor') cursor?: string) {
    return this.performances.getFeed(req.user.userId, cursor);
  }

  @Get(':id')
  async get(@Request() req: any, @Param('id') id: string) {
    return this.performances.getOne(req.user.userId, id);
  }

  @Patch(':id')
  async update(@Request() req: any, @Param('id') id: string, @Body() body: UpdatePerformanceDto) {
    return this.performances.update(req.user.userId, id, body);
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.performances.remove(req.user.userId, id);
  }

  @Post(':id/like')
  async like(@Request() req: any, @Param('id') id: string) {
    return this.performances.toggleLike(req.user.userId, id, true);
  }

  @Delete(':id/like')
  async unlike(@Request() req: any, @Param('id') id: string) {
    return this.performances.toggleLike(req.user.userId, id, false);
  }

  @Get(':id/comments')
  async comments(@Param('id') id: string) {
    return this.performances.listComments(id);
  }

  @Post(':id/comments')
  async addComment(@Request() req: any, @Param('id') id: string, @Body() body: CreatePerformanceCommentDto) {
    return this.performances.addComment(req.user.userId, id, body.text);
  }
}
