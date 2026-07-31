import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Request,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { WordBattleService } from './word-battle.service';
import { PrismaService } from '../prisma.service';

@Controller('word-battle')
@UseGuards(JwtAuthGuard)
export class WordBattleController {
  constructor(
    private readonly wordBattleService: WordBattleService,
    private prisma: PrismaService,
  ) {}

  @Get(':id')
  async getGame(@Request() req: any, @Param('id') id: string) {
    const game = await this.wordBattleService.getGame(id);
    if (!game) throw new NotFoundException('Game not found');
    const seatIndex = this.wordBattleService.seatOf(game, req.user.userId);
    if (seatIndex === null)
      throw new NotFoundException('You are not a player in this game');
    return this.wordBattleService.sanitizeGameForSeat(game, seatIndex);
  }

  // Ledger-only wager flow, same pattern as Pool: stake on start, double
  // back on a win. No dedicated wager row — just wallet transactions.
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
