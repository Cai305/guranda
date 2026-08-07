import { Body, Controller, Get, Param, Post, Request, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CouplesService } from './couples.service';
import { CompleteCoupleChallengeDto } from './dto/complete-challenge.dto';
import { SetSpiceLevelDto, SetSpicyOptInDto, DrawPromptDto } from './dto/spice-settings.dto';

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

  // Truth or Dare / Spin the Bottle / Couples Cards — shared spice-level
  // settings and prompt-drawing endpoints.
  @Get('spice-settings')
  getSpiceSettings(@Request() req: any) {
    return this.couples.getSpiceSettings(req.user.userId);
  }

  @Post('spice-level')
  setSpiceLevel(@Body() body: SetSpiceLevelDto, @Request() req: any) {
    return this.couples.setSpiceLevel(req.user.userId, body.level);
  }

  @Post('spicy-opt-in')
  setSpicyOptIn(@Body() body: SetSpicyOptInDto, @Request() req: any) {
    return this.couples.setSpicyOptIn(req.user.userId, body.optIn);
  }

  @Post('prompt/draw')
  drawPrompt(@Body() body: DrawPromptDto, @Request() req: any) {
    return this.couples.drawPrompt(req.user.userId, body.type);
  }

  @Post('spin-bottle')
  spinBottle(@Request() req: any) {
    return this.couples.spinBottle(req.user.userId);
  }
}
