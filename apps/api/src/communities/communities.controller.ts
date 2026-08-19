import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CommunitiesService } from './communities.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('communities')
@UseGuards(JwtAuthGuard)
export class CommunitiesController {
  constructor(private readonly communitiesService: CommunitiesService) {}

  @Get()
  findAll() {
    return this.communitiesService.findAll();
  }

  @Get('my')
  findMyCommunities(@Request() req: any) {
    return this.communitiesService.findUserCommunities(req.user.userId);
  }

  @Get(':id')
  getCommunityDetails(@Request() req: any, @Param('id') id: string) {
    return this.communitiesService.getCommunityDetails(id, req.user.userId);
  }

  @Post(':id/join')
  joinCommunity(@Request() req: any, @Param('id') id: string) {
    return this.communitiesService.joinCommunity(req.user.userId, id);
  }

  @Post()
  createCommunity(
    @Request() req: any,
    @Body() body: { name: string; description?: string; iconUrl?: string },
  ) {
    return this.communitiesService.createCommunity(
      req.user.userId,
      body.name,
      body.description,
      body.iconUrl,
    );
  }
}
