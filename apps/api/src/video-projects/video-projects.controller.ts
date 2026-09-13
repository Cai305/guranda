import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { VideoProjectsService } from './video-projects.service';
import { CreateVideoProjectDto } from './dto/create-video-project.dto';
import { UpdateVideoProjectDto } from './dto/update-video-project.dto';

@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@Controller('video-projects')
@UseGuards(JwtAuthGuard)
export class VideoProjectsController {
  constructor(private readonly projects: VideoProjectsService) {}

  @Post()
  async create(@Request() req: any, @Body() body: CreateVideoProjectDto) {
    return this.projects.create(req.user.userId, body);
  }

  @Get(':id')
  async get(@Request() req: any, @Param('id') id: string) {
    return this.projects.getOne(req.user.userId, id);
  }

  @Patch(':id')
  async update(@Request() req: any, @Param('id') id: string, @Body() body: UpdateVideoProjectDto) {
    return this.projects.update(req.user.userId, id, body);
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.projects.remove(req.user.userId, id);
  }

  @Post(':id/render')
  async render(@Request() req: any, @Param('id') id: string, @Body('status') status?: string) {
    const publishStatus = status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';
    if (status && status !== 'DRAFT' && status !== 'PUBLISHED') {
      throw new BadRequestException('status must be DRAFT or PUBLISHED');
    }
    return this.projects.render(req.user.userId, id, publishStatus);
  }
}
