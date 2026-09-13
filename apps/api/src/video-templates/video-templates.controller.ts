import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { VideoTemplatesService } from './video-templates.service';
import { CreateVideoTemplateDto } from './dto/create-video-template.dto';

@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@Controller('video-templates')
@UseGuards(JwtAuthGuard)
export class VideoTemplatesController {
  constructor(private readonly templates: VideoTemplatesService) {}

  @Get()
  async list() {
    return this.templates.list();
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.templates.getOne(id);
  }

  @Post()
  async create(@Request() req: any, @Body() body: CreateVideoTemplateDto) {
    return this.templates.create(req.user.userId, body);
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.templates.remove(req.user.userId, id);
  }
}
