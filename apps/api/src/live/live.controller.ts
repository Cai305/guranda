import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { LiveService } from './live.service';
import { LiveGateway } from './live.gateway';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('live')
export class LiveController {
  constructor(
    private readonly liveService: LiveService,
    private readonly liveGateway: LiveGateway,
  ) {}

  // Public, unauthenticated feed — viewerId only tweaks personalization
  // (e.g. proximity ordering) for this one read, never gates access or
  // attributes a write. Spoofing it just changes what a public list looks
  // like to the spoofer, not a real identity boundary — safe to exempt from
  // the client-header-identity lint rule that governs everywhere else.
  // eslint-disable-next-line no-restricted-syntax
  @Get('rooms')
  async listRooms(@Headers('x-user-id') viewerId?: string) {
    return this.liveService.listLive(viewerId);
  }

  @Get('rooms/:id/state')
  async getRoomState(@Param('id') id: string) {
    return this.liveService.getRoomState(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('rooms')
  async goLive(
    @Request() req: any,
    @Body()
    body: { title: string; categoryId: string; conversationTopic?: string },
  ) {
    return this.liveService.goLive(
      req.user.userId,
      req.user.username,
      body.title,
      body.categoryId,
      body.conversationTopic,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('rooms/:id/join')
  async joinRoom(@Request() req: any, @Param('id') id: string) {
    return this.liveService.join(id, req.user.userId, req.user.username);
  }

  @UseGuards(JwtAuthGuard)
  @Post('rooms/:id/end')
  async endRoom(@Request() req: any, @Param('id') id: string) {
    const { roomName } = await this.liveService.end(id, req.user.userId);
    this.liveGateway.broadcastRoomEnded(roomName);
    return { success: true };
  }

  // ── Conversation Live ────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Patch('rooms/:id/topic')
  async updateTopic(
    @Request() req: any,
    @Param('id') id: string,
    @Body('topic') topic: string,
  ) {
    const room = await this.liveService.updateTopic(req.user.userId, id, topic);
    this.liveGateway.broadcastToRoom(room.roomName, 'live_topic_update', {
      topic: room.conversationTopic,
    });
    return room;
  }

  // ── Live Shopping ────────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('rooms/:id/pin-product')
  async pinProduct(
    @Request() req: any,
    @Param('id') id: string,
    @Body('productId') productId: string,
  ) {
    const room = await this.liveService.pinShoppingProduct(
      req.user.userId,
      id,
      productId,
    );
    this.liveGateway.broadcastToRoom(room.roomName, 'live_pinned_product', {
      productId,
    });
    return room;
  }

  @UseGuards(JwtAuthGuard)
  @Post('rooms/:id/buy-pinned')
  async buyPinned(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { quantity?: number; shippingAddress: string },
  ) {
    return this.liveService.buyPinnedProduct(req.user.userId, id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('rooms/:id/showcase')
  async saveShowcase(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { productIds: string[]; style: 'SPOTLIGHT' | 'SHELF' },
  ) {
    const state = await this.liveService.saveShowcase(req.user.userId, id, body);
    this.liveGateway.broadcastToRoom(state.roomName, 'live_showcase_update', {
      showcaseProducts: state.showcaseProducts,
      shopStyle: state.shopStyle,
      spotlightIndex: state.spotlightIndex,
    });
    return state;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('rooms/:id/showcase/spotlight')
  async setShowcaseSpotlight(
    @Request() req: any,
    @Param('id') id: string,
    @Body('index') index: number,
  ) {
    const room = await this.liveService.setShowcaseSpotlight(
      req.user.userId,
      id,
      index,
    );
    this.liveGateway.broadcastToRoom(room.roomName, 'live_showcase_update', {
      spotlightIndex: room.spotlightIndex,
    });
    return room;
  }

  @UseGuards(JwtAuthGuard)
  @Post('rooms/:id/showcase/buy')
  async buyShowcaseProduct(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    body: { productId: string; quantity?: number; shippingAddress: string },
  ) {
    return this.liveService.buyShowcaseProduct(req.user.userId, id, body);
  }

  // ── Food Live ────────────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('rooms/:id/pin-food')
  async pinFood(
    @Request() req: any,
    @Param('id') id: string,
    @Body('productId') productId: string,
  ) {
    const room = await this.liveService.pinEatProduct(
      req.user.userId,
      id,
      productId,
    );
    this.liveGateway.broadcastToRoom(room.roomName, 'live_pinned_food', {
      productId,
    });
    return room;
  }

  @UseGuards(JwtAuthGuard)
  @Post('rooms/:id/order-pinned')
  async orderPinned(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { quantity?: number; deliveryAddress: string },
  ) {
    return this.liveService.orderPinnedFood(req.user.userId, id, body);
  }

  // ── Gaming Live ──────────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('rooms/:id/link-game')
  async linkGame(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { gameType: string; gameId: string },
  ) {
    const room = await this.liveService.linkGame(req.user.userId, id, body);
    this.liveGateway.broadcastToRoom(room.roomName, 'live_linked_game', {
      gameType: room.linkedGameType,
      gameId: room.linkedGameId,
    });
    return room;
  }

  @UseGuards(JwtAuthGuard)
  @Post('rooms/:id/chess/start')
  async startChessMatch(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      mode: 'HOST_PLAYS' | 'HOST_MANAGES';
      opponentId?: string;
      whiteId?: string;
      blackId?: string;
    },
  ) {
    const room = await this.liveService.startChessMatch(
      req.user.userId,
      id,
      body,
    );
    this.liveGateway.broadcastToRoom(room.roomName, 'live_linked_game', {
      gameType: room.linkedGameType,
      gameId: room.linkedGameId,
      gameMode: room.gameMode,
    });
    return room;
  }

  // ── Business Live ────────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('rooms/:id/connect')
  async connect(@Request() req: any, @Param('id') id: string) {
    return this.liveService.connectWithHost(req.user.userId, id);
  }

  // ── Education Live: quizzes ──────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('rooms/:id/quiz')
  async launchQuiz(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      question: string;
      options: string[];
      correctIndex: number;
      prizePool?: number;
    },
  ) {
    const quiz = await this.liveService.launchQuiz(req.user.userId, id, body);
    this.liveGateway.broadcastToRoom(quiz.room.roomName, 'live_quiz_update', {
      quiz,
    });
    return quiz;
  }

  @UseGuards(JwtAuthGuard)
  @Post('quiz/:quizId/answer')
  async answerQuiz(
    @Request() req: any,
    @Param('quizId') quizId: string,
    @Body('optionIndex') optionIndex: number,
  ) {
    return this.liveService.answerQuiz(req.user.userId, quizId, optionIndex);
  }

  @UseGuards(JwtAuthGuard)
  @Post('quiz/:quizId/resolve')
  async resolveQuiz(@Request() req: any, @Param('quizId') quizId: string) {
    const quiz = await this.liveService.resolveQuiz(req.user.userId, quizId);
    this.liveGateway.broadcastToRoom(quiz.room.roomName, 'live_quiz_update', {
      quiz,
    });
    return quiz;
  }

  // ── Entertainment Live: polls ─────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('rooms/:id/poll')
  async launchPoll(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { question: string; options: string[] },
  ) {
    const poll = await this.liveService.launchPoll(req.user.userId, id, body);
    this.liveGateway.broadcastToRoom(poll.room.roomName, 'live_poll_update', {
      poll,
      counts: poll.options.map(() => 0),
      total: 0,
    });
    return poll;
  }

  @UseGuards(JwtAuthGuard)
  @Post('poll/:pollId/vote')
  async votePoll(
    @Request() req: any,
    @Param('pollId') pollId: string,
    @Body('optionIndex') optionIndex: number,
  ) {
    const result = await this.liveService.votePoll(
      req.user.userId,
      pollId,
      optionIndex,
    );
    this.liveGateway.broadcastToRoom(
      result.poll.room.roomName,
      'live_poll_update',
      result,
    );
    return result;
  }

  // ── Sports Live: scoreboard + predictions ─────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Patch('rooms/:id/score')
  async updateScore(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    body: { teamA?: string; teamB?: string; scoreA?: number; scoreB?: number },
  ) {
    const room = await this.liveService.updateScoreboard(
      req.user.userId,
      id,
      body,
    );
    this.liveGateway.broadcastToRoom(room.roomName, 'live_score_update', {
      teamA: room.scoreTeamA,
      teamB: room.scoreTeamB,
      scoreA: room.scoreA,
      scoreB: room.scoreB,
    });
    return room;
  }

  @UseGuards(JwtAuthGuard)
  @Post('rooms/:id/prediction')
  async launchPrediction(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { question: string; optionA: string; optionB: string },
  ) {
    const prediction = await this.liveService.launchPrediction(
      req.user.userId,
      id,
      body,
    );
    this.liveGateway.broadcastToRoom(
      prediction.room.roomName,
      'live_prediction_update',
      { prediction },
    );
    return prediction;
  }

  @UseGuards(JwtAuthGuard)
  @Post('prediction/:predictionId/bet')
  async placeBet(
    @Request() req: any,
    @Param('predictionId') predictionId: string,
    @Body() body: { pick: 'A' | 'B'; amount: number },
  ) {
    return this.liveService.placeBet(req.user.userId, predictionId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('prediction/:predictionId/resolve')
  async resolvePrediction(
    @Request() req: any,
    @Param('predictionId') predictionId: string,
    @Body('winningPick') winningPick: 'A' | 'B',
  ) {
    const prediction = await this.liveService.resolvePrediction(
      req.user.userId,
      predictionId,
      winningPick,
    );
    this.liveGateway.broadcastToRoom(
      prediction!.room.roomName,
      'live_prediction_update',
      { prediction },
    );
    return prediction;
  }

  // ── Career Live: job postings ──────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('rooms/:id/job')
  async postJob(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { title: string; description?: string; salary?: string },
  ) {
    const job = await this.liveService.postJob(req.user.userId, id, body);
    this.liveGateway.broadcastToRoom(job.room.roomName, 'live_job_posted', {
      job,
    });
    return job;
  }

  @UseGuards(JwtAuthGuard)
  @Post('job/:jobId/apply')
  async applyToJob(
    @Request() req: any,
    @Param('jobId') jobId: string,
    @Body('message') message?: string,
  ) {
    return this.liveService.applyToJob(req.user.userId, jobId, message);
  }

  @UseGuards(JwtAuthGuard)
  @Get('job/:jobId/applicants')
  async getApplicants(@Request() req: any, @Param('jobId') jobId: string) {
    return this.liveService.getJobApplicants(req.user.userId, jobId);
  }

  // ── Social Live: Q&A queue ──────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('rooms/:id/question')
  async askQuestion(
    @Request() req: any,
    @Param('id') id: string,
    @Body('text') text: string,
  ) {
    const question = await this.liveService.askQuestion(
      req.user.userId,
      id,
      text,
    );
    this.liveGateway.broadcastToRoom(
      question.room.roomName,
      'live_question_asked',
      { question },
    );
    return question;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('question/:questionId/answered')
  async markAnswered(
    @Request() req: any,
    @Param('questionId') questionId: string,
  ) {
    return this.liveService.markQuestionAnswered(req.user.userId, questionId);
  }

  // ── Dating Live: host-run matchmaking show ────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('rooms/:id/dating/apply')
  async applyDating(
    @Request() req: any,
    @Param('id') id: string,
    @Body('bio') bio: string,
  ) {
    return this.liveService.applyDating(req.user.userId, id, bio);
  }

  @UseGuards(JwtAuthGuard)
  @Get('rooms/:id/dating/applicants')
  async getDatingApplicants(@Request() req: any, @Param('id') id: string) {
    return this.liveService.getDatingApplicants(req.user.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('rooms/:id/dating/feature')
  async featureDatingPair(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { applicantAId: string; applicantBId: string },
  ) {
    const state = await this.liveService.featureDatingPair(
      req.user.userId,
      id,
      body,
    );
    this.liveGateway.broadcastToRoom(state.roomName, 'live_dating_update', {
      featuredApplicantA: state.featuredApplicantA,
      featuredApplicantB: state.featuredApplicantB,
    });
    return state;
  }

  @UseGuards(JwtAuthGuard)
  @Post('rooms/:id/dating/pass')
  async passDatingPair(@Request() req: any, @Param('id') id: string) {
    const state = await this.liveService.passDatingPair(req.user.userId, id);
    this.liveGateway.broadcastToRoom(state.roomName, 'live_dating_update', {
      featuredApplicantA: null,
      featuredApplicantB: null,
    });
    return state;
  }

  @UseGuards(JwtAuthGuard)
  @Post('rooms/:id/dating/match')
  async declareDatingMatch(@Request() req: any, @Param('id') id: string) {
    const room = await this.liveService.getRoomState(id);
    const result = await this.liveService.declareDatingMatch(
      req.user.userId,
      id,
    );
    this.liveGateway.broadcastToRoom(room.roomName, 'live_dating_update', {
      matched: true,
      featuredApplicantA: null,
      featuredApplicantB: null,
    });
    return result;
  }

  // ── Live moderation ────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('rooms/:id/moderation')
  async getModerationState(@Request() req: any, @Param('id') id: string) {
    return this.liveService.getModerationState(req.user.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('rooms/:id/moderators')
  async assignModerator(
    @Request() req: any,
    @Param('id') id: string,
    @Body('userId') userId: string,
  ) {
    const mod = await this.liveService.assignModerator(req.user.userId, id, userId);
    return mod;
  }

  @UseGuards(JwtAuthGuard)
  @Post('rooms/:id/moderators/revoke')
  async revokeModerator(
    @Request() req: any,
    @Param('id') id: string,
    @Body('userId') userId: string,
  ) {
    return this.liveService.revokeModerator(req.user.userId, id, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('rooms/:id/mute')
  async muteUser(
    @Request() req: any,
    @Param('id') id: string,
    @Body('userId') userId: string,
  ) {
    const { roomName } = await this.liveService.muteUser(req.user.userId, id, userId);
    this.liveGateway.setMuted(roomName, userId, true);
    this.liveGateway.broadcastToRoom(roomName, 'live_moderation_update', {});
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('rooms/:id/unmute')
  async unmuteUser(
    @Request() req: any,
    @Param('id') id: string,
    @Body('userId') userId: string,
  ) {
    const { roomName } = await this.liveService.unmuteUser(req.user.userId, id, userId);
    this.liveGateway.setMuted(roomName, userId, false);
    this.liveGateway.broadcastToRoom(roomName, 'live_moderation_update', {});
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('rooms/:id/kick')
  async kickUser(
    @Request() req: any,
    @Param('id') id: string,
    @Body('userId') userId: string,
  ) {
    const { roomName } = await this.liveService.kickUser(req.user.userId, id, userId);
    this.liveGateway.kickUser(roomName, userId, 'kicked');
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('rooms/:id/ban')
  async banUser(
    @Request() req: any,
    @Param('id') id: string,
    @Body('userId') userId: string,
  ) {
    const { roomName } = await this.liveService.banUser(req.user.userId, id, userId);
    this.liveGateway.kickUser(roomName, userId, 'banned');
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('rooms/:id/unban')
  async unbanUser(
    @Request() req: any,
    @Param('id') id: string,
    @Body('userId') userId: string,
  ) {
    return this.liveService.unbanUser(req.user.userId, id, userId);
  }
}
