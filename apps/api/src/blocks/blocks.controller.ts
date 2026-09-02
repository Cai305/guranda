import { Controller, Post, Get, Param, Request, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { BlocksService } from './blocks.service';

// Registered before UsersController in AppModule import order doesn't
// matter here — 'blocked' is a single-segment static path, distinct from
// every ':id/...' two-segment route already on UsersController, and
// ':id/block' / ':id/unblock' are single-segment-plus-static-suffix routes
// that don't collide with anything else under /users.
@Controller('users')
@UseGuards(JwtAuthGuard)
export class BlocksController {
  constructor(private readonly blocks: BlocksService) {}

  @Post(':id/block')
  async block(@Request() req: any, @Param('id') id: string) {
    if (!id) throw new BadRequestException('Missing user id');
    return this.blocks.blockUser(req.user.userId, id);
  }

  @Post(':id/unblock')
  async unblock(@Request() req: any, @Param('id') id: string) {
    if (!id) throw new BadRequestException('Missing user id');
    return this.blocks.unblockUser(req.user.userId, id);
  }

  @Get('blocked')
  async listBlocked(@Request() req: any) {
    return this.blocks.listBlocked(req.user.userId);
  }
}
