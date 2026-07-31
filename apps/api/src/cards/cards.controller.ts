import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CardsService } from './cards.service';
import type { CardGameMode } from './cards.service';
import { PrismaService } from '../prisma.service';

@Controller('cards')
@UseGuards(JwtAuthGuard)
export class CardsController {
  constructor(
    private readonly cardsService: CardsService,
    private prisma: PrismaService,
  ) {}

  @Get('rooms')
  async listRooms(@Query('mode') mode?: CardGameMode) {
    return this.cardsService.listPublicRooms(mode);
  }

  @Get('rooms/:id')
  async getRoom(@Param('id') id: string) {
    const room = await this.cardsService.getRoom(id);
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  @Get('mine/history')
  async getMyHistory(@Request() req: any) {
    // `seats` is a small embedded JSON array (2-4 entries) — filtering it
    // reliably in SQL varies by Postgres/Prisma version, so we scan a
    // bounded recent window and filter in-process instead.
    const recent = await this.prisma.cardGame.findMany({
      where: { status: 'finished' },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });
    return recent
      .filter((g) => (g.seats as any[]).some((s) => s.userId === req.user.userId))
      .slice(0, 50);
  }

  @Get(':id/moves')
  async getMoves(@Request() req: any, @Param('id') id: string) {
    const game = await this.cardsService.getGame(id);
    if (!game) throw new NotFoundException('Game not found');
    const seatIndex = this.cardsService.seatOf(game, req.user.userId);
    if (seatIndex === null || game.status !== 'finished') {
      throw new NotFoundException('Replay only available once a game you played in has finished');
    }
    return this.prisma.cardGameMove.findMany({ where: { gameId: id }, orderBy: { createdAt: 'asc' } });
  }

  @Get(':id')
  async getGame(@Request() req: any, @Param('id') id: string) {
    const game = await this.cardsService.getGame(id);
    if (!game) throw new NotFoundException('Game not found');
    const seatIndex = this.cardsService.seatOf(game, req.user.userId);
    if (seatIndex === null) {
      return this.cardsService.sanitizeGameForSpectator(game);
    }
    return this.cardsService.sanitizeGameForSeat(game, seatIndex);
  }

  // Ledger-only wager flow — identical pattern to word-battle/pool: stake on
  // start, double back on a win. No dedicated wager/escrow row.
  @Post(':id/wager')
  async wager(
    @Request() req: any,
    @Body() body: { action: 'stake' | 'win'; amount: number },
  ) {
    const amount = Number(body.amount);
    if (!(amount > 0) || amount > 1000) {
      throw new BadRequestException('Invalid wager amount');
    }
    const wallet = await this.prisma.wallet.findUnique({ where: { userId: req.user.userId } });
    if (!wallet) throw new BadRequestException('Wallet not found');

    if (body.action === 'stake') {
      if (Number(wallet.balanceMasheleni) < amount) {
        throw new BadRequestException(`Not enough MSH — balance is ${wallet.balanceMasheleni}`);
      }
      await this.prisma.$transaction([
        this.prisma.wallet.update({
          where: { id: wallet.id },
          data: { balanceMasheleni: { decrement: amount } },
        }),
        this.prisma.transaction.create({
          data: { walletId: wallet.id, type: 'PAYMENT', status: 'SUCCESS', amount: -amount },
        }),
      ]);
      return { staked: amount };
    }

    const payout = amount * 2;
    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balanceMasheleni: { increment: payout } },
      }),
      this.prisma.transaction.create({
        data: { walletId: wallet.id, type: 'RECEIVE', status: 'SUCCESS', amount: payout },
      }),
    ]);
    return { paidOut: payout };
  }

  @Post('report')
  async reportPlayer(
    @Request() req: any,
    @Body() body: { reportedUserId: string; gameId?: string; reason: string; details?: string },
  ) {
    if (!body.reportedUserId || !body.reason) {
      throw new BadRequestException('reportedUserId and reason are required');
    }
    return this.prisma.playerReport.create({
      data: {
        reporterId: req.user.userId,
        reportedUserId: body.reportedUserId,
        gameId: body.gameId,
        reason: body.reason,
        details: body.details,
      },
    });
  }
}
