import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { ReviewsService } from './reviews.service';
import type { TransactionType } from './reviews.service';

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post()
  submit(
    @Request() req: any,
    @Body() body: { transactionType: TransactionType; transactionId: string; rating: number; comment?: string },
  ) {
    return this.reviews.submitReview(req.user.userId, body.transactionType, body.transactionId, body.rating, body.comment);
  }

  // Literal route before ':sellerId' below.
  @Get('check')
  check(@Query('transactionType') type: TransactionType, @Query('transactionId') transactionId: string) {
    return this.reviews.checkReview(type, transactionId);
  }

  @Get('seller/:sellerId')
  listForSeller(@Param('sellerId') sellerId: string) {
    return this.reviews.listForSeller(sellerId);
  }

  @Get('seller/:sellerId/reputation')
  reputation(@Param('sellerId') sellerId: string) {
    return this.reviews.getReputation(sellerId);
  }

  @Get('mine/reputation')
  myReputation(@Request() req: any) {
    return this.reviews.getReputation(req.user.userId);
  }
}
