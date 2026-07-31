import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { PrismaService } from '../prisma.service';
import { PoolService } from './pool.service';

// 8-Ball Pool wagers: stake MSH before a vs-AI match, double back on a win.
// Ledger-only (balanceMasheleni), recorded as wallet transactions.

@Controller('pool')
@UseGuards(JwtAuthGuard)
export class PoolController {
  constructor(
    private prisma: PrismaService,
    private readonly poolService: PoolService,
  ) {}

  @Get(':id')
  async getGame(@Request() req: any, @Param('id') id: string) {
    const game = await this.poolService.getGame(id);
    if (!game) throw new NotFoundException('Game not found');
    if (this.poolService.seatOf(game, req.user.userId) === null) {
      throw new NotFoundException('You are not a player in this game');
    }
    return game;
  }

  @Post('wager')
  async wager(
    @Request() req: any,
    @Body() body: { action: 'stake' | 'win'; amount: number },
  ) {
    const amount = Number(body.amount);
    if (!(amount > 0) || amount > 1000) {
      throw new BadRequestException('Invalid wager amount');
    }
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId: req.user.userId },
    });
    if (!wallet) throw new BadRequestException('Wallet not found');

    if (body.action === 'stake') {
      if (Number(wallet.balanceMasheleni) < amount) {
        throw new BadRequestException(
          `Not enough MSH — balance is ${wallet.balanceMasheleni}`,
        );
      }
      await this.prisma.$transaction([
        this.prisma.wallet.update({
          where: { id: wallet.id },
          data: { balanceMasheleni: { decrement: amount } },
        }),
        this.prisma.transaction.create({
          data: {
            walletId: wallet.id,
            type: 'PAYMENT',
            status: 'SUCCESS',
            amount: -amount,
          },
        }),
      ]);
      return { staked: amount };
    }

    // win: pay out double the stake
    const payout = amount * 2;
    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balanceMasheleni: { increment: payout } },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'RECEIVE',
          status: 'SUCCESS',
          amount: payout,
        },
      }),
    ]);
    return { paidOut: payout };
  }
}
