import { Body, Controller, Get, Param, Post, Request, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CouplesService } from './couples.service';
import { CompleteCoupleChallengeDto } from './dto/complete-challenge.dto';

@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@UseGuards(JwtAuthGuard)
@Controller('couples')
export class CouplesController {
  constructor(private readonly couples: CouplesService) {}

  @Get('challenges')
  getChallenges(@Request() req: any) {
    return this.couples.getChallenges(req.user.userId);
  }

  @Post('challenges/:templateId/complete')
  complete(@Param('templateId') templateId: string, @Body() body: CompleteCoupleChallengeDto, @Request() req: any) {
    return this.couples.complete(req.user.userId, templateId, body.note);
  }
}
