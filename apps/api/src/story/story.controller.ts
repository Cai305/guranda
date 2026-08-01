import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { StoryService } from './story.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('stories')
export class StoryController {
  constructor(private readonly storyService: StoryService) {}

  @Post()
  async create(
    @Request() req: any,
    @Body()
    body: {
      textContent?: string;
      mediaUrl?: string;
      backgroundColor?: string;
      musicUrl?: string;
      musicTitle?: string;
      label?: string;
      stickers?: any[];
      items?: {
        name: string;
        brand?: string;
        price?: number;
        isForSale?: boolean;
      }[];
    },
  ) {
    return this.storyService.createStory(req.user.userId, body);
  }

  @Get('feed')
  async feed(@Request() req: any) {
    return this.storyService.getFeed(req.user.userId);
  }

  @Get('labeled')
  async labeled(@Query('label') label?: string) {
    return this.storyService.getLabeledFeed(label);
  }

  @Get('trending-labels')
  async trendingLabels(@Query('days') days?: string) {
    return this.storyService.getTrendingLabels(days ? Number(days) : undefined);
  }

  // Literal route before ':id' below, so Nest doesn't try to match "mine".
  @Get('mine/stats')
  async myStats(@Request() req: any) {
    return this.storyService.getMyStats(req.user.userId);
  }

  @Post(':id/like')
  async like(@Param('id') id: string, @Request() req: any) {
    return this.storyService.like(id, req.user.userId);
  }

  @Post(':id/comment')
  async comment(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { text: string },
  ) {
    return this.storyService.comment(id, req.user.userId, body.text);
  }

  @Post(':id/rank')
  async rank(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { value: number },
  ) {
    return this.storyService.rank(id, req.user.userId, Number(body.value));
  }

  @Post(':id/items/:itemId/buy')
  async buyItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Request() req: any,
  ) {
    return this.storyService.buyItem(id, itemId, req.user.userId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.storyService.deleteStory(id, req.user.userId);
  }
}
