import {
  Controller, Get, Post, Patch, Param, Body, Request, UseGuards,
  BadRequestException, NotFoundException, UsePipes, ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { RelationshipsService } from './relationships.service';
import { PrismaService } from '../prisma.service';
import { UpdateRelationshipStatusDto } from './dto/update-status.dto';
import type { RelationshipStatusType } from '@prisma/client';

@Controller('relationships')
@UseGuards(JwtAuthGuard)
export class RelationshipsController {
  constructor(
    private readonly relationships: RelationshipsService,
    private prisma: PrismaService,
  ) {}

  @Get('mine')
  async getMine(@Request() req: any) {
    return this.relationships.getMine(req.user.userId);
  }

  @Get('pending')
  async listPending(@Request() req: any) {
    return this.relationships.listPending(req.user.userId);
  }

  @Post('request')
  async sendRequest(
    @Request() req: any,
    @Body() body: { username?: string; userId?: string; intendedStatus?: RelationshipStatusType },
  ) {
    let partnerId = body.userId;
    if (!partnerId && body.username) {
      const user = await this.prisma.user.findUnique({ where: { username: body.username.replace(/^@/, '') } });
      if (!user) throw new NotFoundException('User not found');
      partnerId = user.id;
    }
    if (!partnerId) throw new BadRequestException('username or userId is required');
    return this.relationships.sendRequest(req.user.userId, partnerId, body.intendedStatus);
  }

  @Post(':id/accept')
  async accept(@Request() req: any, @Param('id') id: string) {
    return this.relationships.acceptRequest(id, req.user.userId);
  }

  @Post(':id/decline')
  async decline(@Request() req: any, @Param('id') id: string) {
    return this.relationships.declineRequest(id, req.user.userId);
  }

  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @Patch('status')
  async updateStatus(@Request() req: any, @Body() body: UpdateRelationshipStatusDto) {
    return this.relationships.updateStatus(req.user.userId, body.status);
  }
}
