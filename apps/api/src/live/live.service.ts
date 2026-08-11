import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma.service';
import { ShoppingService } from '../shopping/shopping.service';
import { EatService } from '../eat/eat.service';
import { ChatService } from '../chat/chat.service';
import { ChessService } from '../chess/chess.service';
import { FriendsService } from '../friends/friends.service';
import {
  ContentRankingService,
  ReputationLevel,
} from '../ranking/content-ranking.service';

@Injectable()
export class LiveService {
  private readonly apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
  private readonly apiSecret = process.env.LIVEKIT_API_SECRET || 'secret';
  private readonly wsUrl = process.env.LIVEKIT_WS_URL || 'ws://localhost:7880';
  private readonly roomService: RoomServiceClient;

  constructor(
    private prisma: PrismaService,
    private shoppingService: ShoppingService,
    private eatService: EatService,
    private chatService: ChatService,
    private chessService: ChessService,
    private friendsService: FriendsService,
    private ranking: ContentRankingService,
  ) {
    const httpUrl = process.env.LIVEKIT_HTTP_URL || 'http://localhost:7880';
    this.roomService = new RoomServiceClient(
      httpUrl,
      this.apiKey,
      this.apiSecret,
    );
  }

  private async mintToken(
    roomName: string,
    identity: string,
    name: string,
    canPublish: boolean,
  ) {
    const token = new AccessToken(this.apiKey, this.apiSecret, {
      identity,
      name,
    });
    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish,
      canSubscribe: true,
      canPublishData: true,
    });
    return token.toJwt();
  }

  private async getRoom(roomId: string) {
    const room = await this.prisma.liveRoom.findUnique({
      where: { id: roomId },
    });
    if (!room) throw new NotFoundException('Stream not found');
    return room;
  }

  private assertHost(room: { hostId: string }, userId: string) {
    if (room.hostId !== userId)
      throw new ForbiddenException('Only the host can do this');
  }

  async goLive(
    hostId: string,
    hostName: string,
    title: string,
    categoryId: string,
    conversationTopic?: string,
  ) {
    const roomName = `live-${randomUUID()}`;
    await this.roomService.createRoom({
      name: roomName,
      emptyTimeout: 300,
      maxParticipants: 50,
    });

    const room = await this.prisma.liveRoom.create({
      data: {
        roomName,
        title,
        categoryId,
        hostId,
        conversationTopic: conversationTopic?.trim() || null,
      },
    });

    const token = await this.mintToken(roomName, hostId, hostName, true);
    return { ...room, token, wsUrl: this.wsUrl };
  }

  async listLive(viewerId?: string) {
    const [rooms, viewer] = await Promise.all([
      this.prisma.liveRoom.findMany({
        where: { isLive: true },
        orderBy: { startedAt: 'desc' },
        include: {
          host: {
            select: {
              id: true,
              username: true,
              profile: { select: { displayName: true, avatarUrl: true } },
              locationLat: true,
              locationLng: true,
              activeUsername: true,
            },
          },
        },
      }),
      viewerId
        ? this.prisma.user.findUnique({
            where: { id: viewerId },
            select: { locationLat: true, locationLng: true },
          })
        : null,
    ]);

    // Discovery reorders, doesn't truncate — every live room stays visible.
    return this.ranking.rank(rooms, (r) =>
      this.ranking.scoreItem({
        createdAt: r.startedAt,
        authorReputationScore: r.host.activeUsername?.reputationScore ?? 0,
        authorLevel:
          (r.host.activeUsername?.level as ReputationLevel) ?? 'Nano',
        authorLat: r.host.locationLat,
        authorLng: r.host.locationLng,
        viewerLat: viewer?.locationLat,
        viewerLng: viewer?.locationLng,
      }),
    );
  }

  async join(roomId: string, userId: string, userName: string) {
    const room = await this.prisma.liveRoom.findUnique({
      where: { id: roomId },
    });
    if (!room || !room.isLive)
      throw new NotFoundException('This stream has ended');
    if (room.hostId !== userId) {
      const banned = await this.prisma.liveRoomModerationAction.findUnique({
        where: { roomId_userId_type: { roomId: room.id, userId, type: 'BANNED' } },
      });
      if (banned) throw new ForbiddenException('You have been banned from this stream');
    }

    // The host rejoining their own still-live room (app backgrounded,
    // screen navigated away and back, etc.) needs a publish-capable token
    // and a signal to the client to open the host studio, not viewer mode.
    // An accepted guest gets the same publish rights as the host — they're
    // a real second camera on stage, not just a viewer.
    const isHost = room.hostId === userId;
    const isAcceptedGuest = !isHost && (await this.prisma.liveRoomGuest.findUnique({
      where: { roomId_userId: { roomId: room.id, userId } },
    }))?.status === 'ACCEPTED';
    const token = await this.mintToken(room.roomName, userId, userName, isHost || isAcceptedGuest);
    return {
      roomName: room.roomName,
      token,
      wsUrl: this.wsUrl,
      isHost,
      isGuest: isAcceptedGuest,
      title: room.title,
      categoryId: room.categoryId,
    };
  }

  async end(roomId: string, userId: string) {
    const room = await this.prisma.liveRoom.findUnique({
      where: { id: roomId },
    });
    if (!room) throw new NotFoundException('Stream not found');
    if (room.hostId !== userId)
      throw new ForbiddenException('Only the host can end this stream');

    await this.prisma.liveRoom.update({
      where: { id: roomId },
      data: { isLive: false, endedAt: new Date() },
    });

    try {
      await this.roomService.deleteRoom(room.roomName);
    } catch {
      // Room may already be empty/gone on the LiveKit side; not fatal.
    }

    return { roomName: room.roomName };
  }

  async getRoomState(roomId: string) {
    const room = await this.prisma.liveRoom.findUnique({
      where: { id: roomId },
      include: {
        quizzes: {
          where: { status: 'OPEN' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        polls: {
          where: { status: 'OPEN' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        predictions: {
          where: { status: 'OPEN' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        jobPostings: { orderBy: { createdAt: 'desc' } },
        questions: { orderBy: { createdAt: 'desc' }, take: 50 },
        showcaseProducts: { orderBy: { position: 'asc' } },
      },
    });
    if (!room) throw new NotFoundException('Stream not found');

    const [pinnedShoppingProduct, pinnedEatProduct, showcaseItems, featuredA, featuredB] =
      await Promise.all([
        room.pinnedShoppingProductId
          ? this.prisma.shoppingProduct.findUnique({
              where: { id: room.pinnedShoppingProductId },
            })
          : null,
        room.pinnedEatProductId
          ? this.prisma.eatProduct.findUnique({
              where: { id: room.pinnedEatProductId },
            })
          : null,
        room.showcaseProducts.length
          ? this.prisma.shoppingProduct.findMany({
              where: { id: { in: room.showcaseProducts.map((s) => s.productId) } },
            })
          : [],
        room.featuredApplicantAId
          ? this.prisma.liveDatingApplicant.findUnique({
              where: { id: room.featuredApplicantAId },
              include: { user: { select: { id: true, username: true, profile: true } } },
            })
          : null,
        room.featuredApplicantBId
          ? this.prisma.liveDatingApplicant.findUnique({
              where: { id: room.featuredApplicantBId },
              include: { user: { select: { id: true, username: true, profile: true } } },
            })
          : null,
      ]);

    const productById = new Map(showcaseItems.map((p): [string, typeof p] => [p.id, p]));
    const showcaseProducts = room.showcaseProducts
      .map((s) => ({ ...s, product: productById.get(s.productId) }))
      .filter((s) => !!s.product);

    return {
      ...room,
      pinnedShoppingProduct,
      pinnedEatProduct,
      showcaseProducts,
      featuredApplicantA: featuredA,
      featuredApplicantB: featuredB,
    };
  }

  // ── Conversation Live ────────────────────────────────────────────────────
  // Freely typed by the host, changeable at any point during the stream —
  // not just at go-live setup.
  async updateTopic(hostId: string, roomId: string, topic: string) {
    const room = await this.getRoom(roomId);
    this.assertHost(room, hostId);
    return this.prisma.liveRoom.update({
      where: { id: roomId },
      data: { conversationTopic: topic?.trim() || null },
    });
  }

  // ── Live Shopping ────────────────────────────────────────────────────────
  async pinShoppingProduct(hostId: string, roomId: string, productId: string) {
    const room = await this.getRoom(roomId);
    this.assertHost(room, hostId);
    const product = await this.prisma.shoppingProduct.findUnique({
      where: { id: productId },
      include: { store: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    if (product.store.ownerId !== hostId)
      throw new ForbiddenException('You can only pin your own products');
    return this.prisma.liveRoom.update({
      where: { id: roomId },
      data: { pinnedShoppingProductId: productId },
    });
  }

  async buyPinnedProduct(
    buyerId: string,
    roomId: string,
    dto: { quantity?: number; shippingAddress: string },
  ) {
    const room = await this.getRoom(roomId);
    if (!room.pinnedShoppingProductId)
      throw new BadRequestException('Nothing is pinned right now');
    if (!dto.shippingAddress)
      throw new BadRequestException('Shipping address is required');
    const product = await this.prisma.shoppingProduct.findUnique({
      where: { id: room.pinnedShoppingProductId },
    });
    if (!product)
      throw new NotFoundException('Pinned product no longer exists');
    return this.shoppingService.placeOrder(buyerId, {
      storeId: product.storeId,
      items: [{ productId: product.id, quantity: dto.quantity || 1 }],
      shippingAddress: dto.shippingAddress,
      notes: `Bought live during "${room.title}"`,
    });
  }

  // Multi-product showcase (1-10 products, ordered) — replaces the whole
  // showcase in place each time the host saves it, so "arranging the
  // flow" is just resubmitting the full ordered list.
  async saveShowcase(
    hostId: string,
    roomId: string,
    dto: { productIds: string[]; style: 'SPOTLIGHT' | 'SHELF' },
  ) {
    const room = await this.getRoom(roomId);
    this.assertHost(room, hostId);
    const ids = [...new Set(dto.productIds || [])];
    if (ids.length < 1 || ids.length > 10)
      throw new BadRequestException('Showcase 1 to 10 products');
    if (dto.style !== 'SPOTLIGHT' && dto.style !== 'SHELF')
      throw new BadRequestException('Style must be SPOTLIGHT or SHELF');

    const products = await this.prisma.shoppingProduct.findMany({
      where: { id: { in: ids } },
      include: { store: true },
    });
    if (products.length !== ids.length)
      throw new NotFoundException('One or more products not found');
    if (products.some((p) => p.store.ownerId !== hostId))
      throw new ForbiddenException('You can only showcase your own products');

    await this.prisma.$transaction([
      this.prisma.liveShowcaseProduct.deleteMany({ where: { roomId } }),
      this.prisma.liveShowcaseProduct.createMany({
        data: ids.map((productId, position) => ({ roomId, productId, position })),
      }),
      this.prisma.liveRoom.update({
        where: { id: roomId },
        data: { shopStyle: dto.style, spotlightIndex: 0 },
      }),
    ]);
    return this.getRoomState(roomId);
  }

  async setShowcaseSpotlight(hostId: string, roomId: string, index: number) {
    const room = await this.getRoom(roomId);
    this.assertHost(room, hostId);
    const count = await this.prisma.liveShowcaseProduct.count({ where: { roomId } });
    if (index < 0 || index >= count)
      throw new BadRequestException('Index out of range');
    return this.prisma.liveRoom.update({
      where: { id: roomId },
      data: { spotlightIndex: index },
    });
  }

  async buyShowcaseProduct(
    buyerId: string,
    roomId: string,
    dto: { productId: string; quantity?: number; shippingAddress: string },
  ) {
    await this.getRoom(roomId);
    if (!dto.shippingAddress)
      throw new BadRequestException('Shipping address is required');
    const inShowcase = await this.prisma.liveShowcaseProduct.findUnique({
      where: { roomId_productId: { roomId, productId: dto.productId } },
    });
    if (!inShowcase)
      throw new BadRequestException('That product is not in this stream\'s showcase');
    const product = await this.prisma.shoppingProduct.findUnique({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Product no longer exists');
    return this.shoppingService.placeOrder(buyerId, {
      storeId: product.storeId,
      items: [{ productId: product.id, quantity: dto.quantity || 1 }],
      shippingAddress: dto.shippingAddress,
      notes: `Bought live during a showcase`,
    });
  }

  // ── Food Live ────────────────────────────────────────────────────────────
  async pinEatProduct(hostId: string, roomId: string, productId: string) {
    const room = await this.getRoom(roomId);
    this.assertHost(room, hostId);
    const product = await this.prisma.eatProduct.findUnique({
      where: { id: productId },
      include: { store: true },
    });
    if (!product) throw new NotFoundException('Menu item not found');
    if (product.store.ownerId !== hostId)
      throw new ForbiddenException('You can only pin your own menu items');
    return this.prisma.liveRoom.update({
      where: { id: roomId },
      data: { pinnedEatProductId: productId },
    });
  }

  async orderPinnedFood(
    buyerId: string,
    roomId: string,
    dto: { quantity?: number; deliveryAddress: string },
  ) {
    const room = await this.getRoom(roomId);
    if (!room.pinnedEatProductId)
      throw new BadRequestException('Nothing is pinned right now');
    if (!dto.deliveryAddress)
      throw new BadRequestException('Delivery address is required');
    const product = await this.prisma.eatProduct.findUnique({
      where: { id: room.pinnedEatProductId },
    });
    if (!product) throw new NotFoundException('Pinned item no longer exists');
    return this.eatService.placeOrder(buyerId, {
      storeId: product.storeId,
      items: [{ productId: product.id, quantity: dto.quantity || 1 }],
      deliveryAddress: dto.deliveryAddress,
      notes: `Ordered live during "${room.title}"`,
    });
  }

  // ── Gaming Live ──────────────────────────────────────────────────────────
  async linkGame(
    hostId: string,
    roomId: string,
    dto: { gameType: string; gameId: string },
  ) {
    const room = await this.getRoom(roomId);
    this.assertHost(room, hostId);
    const VALID = ['pool', 'ludo', 'chess', 'murabaraba', 'wordbattle'];
    if (!VALID.includes(dto.gameType))
      throw new BadRequestException('Unknown game type');
    return this.prisma.liveRoom.update({
      where: { id: roomId },
      data: { linkedGameType: dto.gameType, linkedGameId: dto.gameId },
    });
  }

  // Chess only gets a real in-app match-creation flow (the other game
  // types keep the paste-an-existing-ID flow above). The chess socket
  // gateway already lets any client spectate a gameId room with zero
  // access control, so this only needs to create the game + link it.
  async startChessMatch(
    hostId: string,
    roomId: string,
    dto: {
      mode: 'HOST_PLAYS' | 'HOST_MANAGES';
      opponentId?: string;
      whiteId?: string;
      blackId?: string;
    },
  ) {
    const room = await this.getRoom(roomId);
    this.assertHost(room, hostId);

    let whiteId: string;
    let blackId: string;
    if (dto.mode === 'HOST_PLAYS') {
      if (!dto.opponentId)
        throw new BadRequestException('Pick an opponent to play against');
      if (dto.opponentId === hostId)
        throw new BadRequestException("You can't play against yourself");
      if (!(await this.friendsService.areFriends(hostId, dto.opponentId)))
        throw new ForbiddenException('You can only start a match with a friend');
      whiteId = hostId;
      blackId = dto.opponentId;
    } else if (dto.mode === 'HOST_MANAGES') {
      if (!dto.whiteId || !dto.blackId)
        throw new BadRequestException('Pick two players to manage a match between');
      if (dto.whiteId === dto.blackId)
        throw new BadRequestException('Pick two different players');
      if (dto.whiteId === hostId || dto.blackId === hostId)
        throw new BadRequestException(
          'In Host Manages mode the host referees, not plays — pick two other players',
        );
      const [friendA, friendB] = await Promise.all([
        this.friendsService.areFriends(hostId, dto.whiteId),
        this.friendsService.areFriends(hostId, dto.blackId),
      ]);
      if (!friendA || !friendB)
        throw new ForbiddenException('Both players must be your friends');
      whiteId = dto.whiteId;
      blackId = dto.blackId;
    } else {
      throw new BadRequestException('Unknown mode');
    }

    const game = await this.chessService.createGame(whiteId, blackId, 600);
    return this.prisma.liveRoom.update({
      where: { id: roomId },
      data: { linkedGameType: 'chess', linkedGameId: game.id, gameMode: dto.mode },
    });
  }

  // ── Business Live ────────────────────────────────────────────────────────
  async connectWithHost(viewerId: string, roomId: string) {
    const room = await this.getRoom(roomId);
    if (room.hostId === viewerId)
      throw new BadRequestException("You can't connect with yourself");
    return this.chatService.createDirectChat(viewerId, room.hostId);
  }

  // ── Education Live: quiz with an optional host-funded prize ─────────────
  async launchQuiz(
    hostId: string,
    roomId: string,
    dto: {
      question: string;
      options: string[];
      correctIndex: number;
      prizePool?: number;
    },
  ) {
    const room = await this.getRoom(roomId);
    this.assertHost(room, hostId);
    if (!dto.question || !dto.options || dto.options.length < 2)
      throw new BadRequestException(
        'A question and at least 2 options are required',
      );
    if (dto.correctIndex < 0 || dto.correctIndex >= dto.options.length)
      throw new BadRequestException('Invalid correct option');
    const prizePool = Number(dto.prizePool) || 0;
    if (prizePool > 0) {
      const wallet = await this.prisma.wallet.findUnique({
        where: { userId: hostId },
      });
      if (!wallet || wallet.balanceMasheleni < prizePool)
        throw new BadRequestException('Insufficient MSH to fund this prize');
    }
    await this.prisma.liveQuiz.updateMany({
      where: { roomId, status: 'OPEN' },
      data: { status: 'RESOLVED' },
    });
    return this.prisma.liveQuiz.create({
      data: {
        roomId,
        question: dto.question,
        options: dto.options,
        correctIndex: dto.correctIndex,
        prizePool,
      },
      include: { room: true },
    });
  }

  async answerQuiz(userId: string, quizId: string, optionIndex: number) {
    const quiz = await this.prisma.liveQuiz.findUnique({
      where: { id: quizId },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');
    if (quiz.status !== 'OPEN')
      throw new BadRequestException('This quiz has closed');
    const existing = await this.prisma.liveQuizAnswer.findUnique({
      where: { quizId_userId: { quizId, userId } },
    });
    if (existing)
      throw new BadRequestException('You already answered this quiz');
    return this.prisma.liveQuizAnswer.create({
      data: {
        quizId,
        userId,
        optionIndex,
        correct: optionIndex === quiz.correctIndex,
      },
    });
  }

  async resolveQuiz(hostId: string, quizId: string) {
    const quiz = await this.prisma.liveQuiz.findUnique({
      where: { id: quizId },
      include: { room: true, answers: true },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');
    this.assertHost(quiz.room, hostId);
    if (quiz.status === 'RESOLVED')
      throw new BadRequestException('Quiz already resolved');

    const winners = quiz.answers.filter((a) => a.correct);
    if (quiz.prizePool > 0 && winners.length > 0) {
      const hostWallet = await this.prisma.wallet.findUnique({
        where: { userId: hostId },
      });
      if (!hostWallet) throw new BadRequestException('Host wallet not found');
      const share = parseFloat((quiz.prizePool / winners.length).toFixed(2));
      const ops: any[] = [
        this.prisma.wallet.update({
          where: { userId: hostId },
          data: { balanceMasheleni: { decrement: quiz.prizePool } },
        }),
        this.prisma.transaction.create({
          data: {
            walletId: hostWallet.id,
            amount: -quiz.prizePool,
            type: 'PAYMENT',
            status: 'SUCCESS',
          },
        }),
      ];
      for (const winner of winners) {
        const winnerWallet = await this.prisma.wallet.findUnique({
          where: { userId: winner.userId },
        });
        if (!winnerWallet) continue;
        ops.push(
          this.prisma.wallet.update({
            where: { userId: winner.userId },
            data: { balanceMasheleni: { increment: share } },
          }),
          this.prisma.transaction.create({
            data: {
              walletId: winnerWallet.id,
              amount: share,
              type: 'RECEIVE',
              status: 'SUCCESS',
            },
          }),
        );
      }
      await this.prisma.$transaction(ops);
    }

    return this.prisma.liveQuiz.update({
      where: { id: quizId },
      data: { status: 'RESOLVED' },
      include: { room: true },
    });
  }

  // ── Entertainment Live: live polls ───────────────────────────────────────
  async launchPoll(
    hostId: string,
    roomId: string,
    dto: { question: string; options: string[] },
  ) {
    const room = await this.getRoom(roomId);
    this.assertHost(room, hostId);
    if (!dto.question || !dto.options || dto.options.length < 2)
      throw new BadRequestException(
        'A question and at least 2 options are required',
      );
    await this.prisma.livePoll.updateMany({
      where: { roomId, status: 'OPEN' },
      data: { status: 'CLOSED' },
    });
    return this.prisma.livePoll.create({
      data: { roomId, question: dto.question, options: dto.options },
      include: { room: true },
    });
  }

  async votePoll(userId: string, pollId: string, optionIndex: number) {
    const poll = await this.prisma.livePoll.findUnique({
      where: { id: pollId },
    });
    if (!poll) throw new NotFoundException('Poll not found');
    if (poll.status !== 'OPEN')
      throw new BadRequestException('This poll has closed');
    const existing = await this.prisma.livePollVote.findUnique({
      where: { pollId_userId: { pollId, userId } },
    });
    if (existing) throw new BadRequestException('You already voted');
    await this.prisma.livePollVote.create({
      data: { pollId, userId, optionIndex },
    });
    return this.pollResults(pollId);
  }

  async pollResults(pollId: string) {
    const poll = await this.prisma.livePoll.findUnique({
      where: { id: pollId },
      include: { votes: true, room: true },
    });
    if (!poll) throw new NotFoundException('Poll not found');
    const counts = poll.options.map(
      (_, i) => poll.votes.filter((v) => v.optionIndex === i).length,
    );
    return { poll, counts, total: poll.votes.length };
  }

  // ── Sports Live: scoreboard + pari-mutuel prediction pool ────────────────
  async updateScoreboard(
    hostId: string,
    roomId: string,
    dto: { teamA?: string; teamB?: string; scoreA?: number; scoreB?: number },
  ) {
    const room = await this.getRoom(roomId);
    this.assertHost(room, hostId);
    return this.prisma.liveRoom.update({
      where: { id: roomId },
      data: {
        ...(dto.teamA !== undefined ? { scoreTeamA: dto.teamA } : {}),
        ...(dto.teamB !== undefined ? { scoreTeamB: dto.teamB } : {}),
        ...(dto.scoreA !== undefined ? { scoreA: dto.scoreA } : {}),
        ...(dto.scoreB !== undefined ? { scoreB: dto.scoreB } : {}),
      },
    });
  }

  async launchPrediction(
    hostId: string,
    roomId: string,
    dto: { question: string; optionA: string; optionB: string },
  ) {
    const room = await this.getRoom(roomId);
    this.assertHost(room, hostId);
    if (!dto.question || !dto.optionA || !dto.optionB)
      throw new BadRequestException('Question and both options are required');
    await this.prisma.livePrediction.updateMany({
      where: { roomId, status: 'OPEN' },
      data: { status: 'RESOLVED_A' },
    });
    return this.prisma.livePrediction.create({
      data: {
        roomId,
        question: dto.question,
        optionA: dto.optionA,
        optionB: dto.optionB,
      },
      include: { room: true },
    });
  }

  async placeBet(
    userId: string,
    predictionId: string,
    dto: { pick: 'A' | 'B'; amount: number },
  ) {
    const prediction = await this.prisma.livePrediction.findUnique({
      where: { id: predictionId },
    });
    if (!prediction) throw new NotFoundException('Prediction not found');
    if (prediction.status !== 'OPEN')
      throw new BadRequestException('Betting has closed');
    if (dto.pick !== 'A' && dto.pick !== 'B')
      throw new BadRequestException('Pick must be A or B');
    const amount = Number(dto.amount);
    if (!(amount > 0)) throw new BadRequestException('Enter a positive stake');
    const existing = await this.prisma.livePredictionBet.findUnique({
      where: { predictionId_userId: { predictionId, userId } },
    });
    if (existing)
      throw new BadRequestException(
        'You already placed a bet on this prediction',
      );

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new BadRequestException('No wallet found');
    if (wallet.balanceMasheleni < amount)
      throw new BadRequestException('Insufficient MSH balance');

    const [bet] = await this.prisma.$transaction([
      this.prisma.livePredictionBet.create({
        data: { predictionId, userId, pick: dto.pick, amount },
      }),
      this.prisma.wallet.update({
        where: { userId },
        data: { balanceMasheleni: { decrement: amount } },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: wallet.id,
          amount: -amount,
          type: 'PAYMENT',
          status: 'SUCCESS',
        },
      }),
    ]);
    return bet;
  }

  async resolvePrediction(
    hostId: string,
    predictionId: string,
    winningPick: 'A' | 'B',
  ) {
    const prediction = await this.prisma.livePrediction.findUnique({
      where: { id: predictionId },
      include: { room: true, bets: true },
    });
    if (!prediction) throw new NotFoundException('Prediction not found');
    this.assertHost(prediction.room, hostId);
    if (prediction.status !== 'OPEN')
      throw new BadRequestException('Already resolved');

    const pot = prediction.bets.reduce((s, b) => s + b.amount, 0);
    const winners = prediction.bets.filter((b) => b.pick === winningPick);
    const winnerStake = winners.reduce((s, b) => s + b.amount, 0);

    const ops: any[] = [];
    for (const bet of winners) {
      const payout =
        winnerStake > 0
          ? parseFloat(((bet.amount / winnerStake) * pot).toFixed(2))
          : 0;
      const wallet = await this.prisma.wallet.findUnique({
        where: { userId: bet.userId },
      });
      if (!wallet) continue;
      ops.push(
        this.prisma.wallet.update({
          where: { userId: bet.userId },
          data: { balanceMasheleni: { increment: payout } },
        }),
        this.prisma.transaction.create({
          data: {
            walletId: wallet.id,
            amount: payout,
            type: 'RECEIVE',
            status: 'SUCCESS',
          },
        }),
        this.prisma.livePredictionBet.update({
          where: { id: bet.id },
          data: { payout },
        }),
      );
    }
    ops.push(
      this.prisma.livePrediction.update({
        where: { id: predictionId },
        data: { status: winningPick === 'A' ? 'RESOLVED_A' : 'RESOLVED_B' },
      }),
    );
    await this.prisma.$transaction(ops);
    return this.prisma.livePrediction.findUnique({
      where: { id: predictionId },
      include: { bets: true, room: true },
    });
  }

  // ── Career Live: job postings + applications ─────────────────────────────
  async postJob(
    hostId: string,
    roomId: string,
    dto: { title: string; description?: string; salary?: string },
  ) {
    const room = await this.getRoom(roomId);
    this.assertHost(room, hostId);
    if (!dto.title) throw new BadRequestException('A job title is required');
    return this.prisma.liveJobPosting.create({
      data: {
        roomId,
        title: dto.title,
        description: dto.description || null,
        salary: dto.salary || null,
      },
      include: { room: true },
    });
  }

  async applyToJob(applicantId: string, jobId: string, message?: string) {
    const job = await this.prisma.liveJobPosting.findUnique({
      where: { id: jobId },
      include: { room: true },
    });
    if (!job) throw new NotFoundException('Job posting not found');
    if (job.room.hostId === applicantId)
      throw new BadRequestException("You can't apply to your own posting");
    const existing = await this.prisma.liveJobApplication.findFirst({
      where: { jobId, applicantId },
    });
    if (existing)
      throw new BadRequestException('You already applied to this job');
    return this.prisma.liveJobApplication.create({
      data: { jobId, applicantId, message: message || null },
    });
  }

  async getJobApplicants(hostId: string, jobId: string) {
    const job = await this.prisma.liveJobPosting.findUnique({
      where: { id: jobId },
      include: { room: true },
    });
    if (!job) throw new NotFoundException('Job posting not found');
    this.assertHost(job.room, hostId);
    return this.prisma.liveJobApplication.findMany({
      where: { jobId },
      include: {
        applicant: { select: { id: true, username: true, profile: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Social Live: live Q&A queue ───────────────────────────────────────────
  async askQuestion(askerId: string, roomId: string, text: string) {
    await this.getRoom(roomId); // throws if the room doesn't exist
    if (!text?.trim())
      throw new BadRequestException('Question cannot be empty');
    return this.prisma.liveQuestion.create({
      data: { roomId, askerId, text: text.trim() },
      include: { room: true },
    });
  }

  async markQuestionAnswered(hostId: string, questionId: string) {
    const question = await this.prisma.liveQuestion.findUnique({
      where: { id: questionId },
      include: { room: true },
    });
    if (!question) throw new NotFoundException('Question not found');
    this.assertHost(question.room, hostId);
    return this.prisma.liveQuestion.update({
      where: { id: questionId },
      data: { answered: true },
    });
  }

  // ── Dating Live: host-run matchmaking show ────────────────────────────────
  // "Match or Pass?" audience voting reuses launchPoll/votePoll above
  // directly — no dedicated voting endpoints needed here.
  async applyDating(userId: string, roomId: string, bio: string) {
    const room = await this.getRoom(roomId);
    if (room.hostId === userId)
      throw new BadRequestException("You can't apply to your own stream");
    const trimmed = (bio || '').trim().slice(0, 200);
    if (!trimmed) throw new BadRequestException('Tell us a little about you first');
    return this.prisma.liveDatingApplicant.upsert({
      where: { roomId_userId: { roomId, userId } },
      create: { roomId, userId, bio: trimmed },
      update: { bio: trimmed },
    });
  }

  async getDatingApplicants(hostId: string, roomId: string) {
    const room = await this.getRoom(roomId);
    this.assertHost(room, hostId);
    return this.prisma.liveDatingApplicant.findMany({
      where: { roomId, status: 'PENDING' },
      include: { user: { select: { id: true, username: true, profile: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async featureDatingPair(
    hostId: string,
    roomId: string,
    dto: { applicantAId: string; applicantBId: string },
  ) {
    const room = await this.getRoom(roomId);
    this.assertHost(room, hostId);
    if (dto.applicantAId === dto.applicantBId)
      throw new BadRequestException('Pick two different applicants');
    const [a, b] = await Promise.all([
      this.prisma.liveDatingApplicant.findUnique({ where: { id: dto.applicantAId } }),
      this.prisma.liveDatingApplicant.findUnique({ where: { id: dto.applicantBId } }),
    ]);
    if (!a || a.roomId !== roomId || !b || b.roomId !== roomId)
      throw new NotFoundException('Applicant not found in this stream');

    await this.prisma.$transaction([
      this.prisma.liveDatingApplicant.update({
        where: { id: a.id },
        data: { status: 'FEATURED' },
      }),
      this.prisma.liveDatingApplicant.update({
        where: { id: b.id },
        data: { status: 'FEATURED' },
      }),
      this.prisma.liveRoom.update({
        where: { id: roomId },
        data: { featuredApplicantAId: a.id, featuredApplicantBId: b.id },
      }),
    ]);
    return this.getRoomState(roomId);
  }

  async passDatingPair(hostId: string, roomId: string) {
    const room = await this.getRoom(roomId);
    this.assertHost(room, hostId);
    const ids = [room.featuredApplicantAId, room.featuredApplicantBId].filter(
      (id): id is string => !!id,
    );
    await this.prisma.$transaction([
      ...(ids.length
        ? [
            this.prisma.liveDatingApplicant.updateMany({
              where: { id: { in: ids } },
              data: { status: 'PASSED' },
            }),
          ]
        : []),
      this.prisma.liveRoom.update({
        where: { id: roomId },
        data: { featuredApplicantAId: null, featuredApplicantBId: null },
      }),
    ]);
    return this.getRoomState(roomId);
  }

  async declareDatingMatch(hostId: string, roomId: string) {
    const room = await this.getRoom(roomId);
    this.assertHost(room, hostId);
    if (!room.featuredApplicantAId || !room.featuredApplicantBId)
      throw new BadRequestException('Feature a pair before declaring a match');
    const [a, b] = await Promise.all([
      this.prisma.liveDatingApplicant.findUnique({
        where: { id: room.featuredApplicantAId },
      }),
      this.prisma.liveDatingApplicant.findUnique({
        where: { id: room.featuredApplicantBId },
      }),
    ]);
    if (!a || !b) throw new NotFoundException('Featured applicants not found');

    await this.prisma.$transaction([
      this.prisma.liveDatingApplicant.update({
        where: { id: a.id },
        data: { status: 'MATCHED' },
      }),
      this.prisma.liveDatingApplicant.update({
        where: { id: b.id },
        data: { status: 'MATCHED' },
      }),
      this.prisma.liveRoom.update({
        where: { id: roomId },
        data: { featuredApplicantAId: null, featuredApplicantBId: null },
      }),
    ]);
    await this.chatService.createDirectChat(a.userId, b.userId);
    return { matched: true, applicantAId: a.userId, applicantBId: b.userId };
  }

  // ── Live moderation ────────────────────────────────────────────────────
  // Assign/revoke moderator is host-only. Mute/kick/ban can be done by the
  // host OR any current moderator — assertCanModerate covers both.
  private async assertCanModerate(room: { id: string; hostId: string }, actorId: string) {
    if (room.hostId === actorId) return;
    const mod = await this.prisma.liveRoomModerator.findUnique({
      where: { roomId_userId: { roomId: room.id, userId: actorId } },
    });
    if (!mod) throw new ForbiddenException('Only the host or a moderator can do this');
  }

  async getModerationState(userId: string, roomId: string) {
    const room = await this.getRoom(roomId);
    await this.assertCanModerate(room, userId);
    const [moderators, actions] = await Promise.all([
      this.prisma.liveRoomModerator.findMany({
        where: { roomId },
        include: { user: { select: { id: true, username: true, profile: true } } },
      }),
      this.prisma.liveRoomModerationAction.findMany({
        where: { roomId },
        include: { user: { select: { id: true, username: true, profile: true } } },
      }),
    ]);
    return {
      moderators,
      muted: actions.filter((a) => a.type === 'MUTED'),
      banned: actions.filter((a) => a.type === 'BANNED'),
    };
  }

  async assignModerator(hostId: string, roomId: string, userId: string) {
    const room = await this.getRoom(roomId);
    this.assertHost(room, hostId);
    if (userId === hostId)
      throw new BadRequestException("You're already running the show");
    return this.prisma.liveRoomModerator.upsert({
      where: { roomId_userId: { roomId, userId } },
      create: { roomId, userId },
      update: {},
    });
  }

  async revokeModerator(hostId: string, roomId: string, userId: string) {
    const room = await this.getRoom(roomId);
    this.assertHost(room, hostId);
    await this.prisma.liveRoomModerator.deleteMany({ where: { roomId, userId } });
    return { success: true };
  }

  async muteUser(actorId: string, roomId: string, userId: string) {
    const room = await this.getRoom(roomId);
    await this.assertCanModerate(room, actorId);
    if (userId === room.hostId) throw new BadRequestException("You can't mute the host");
    await this.prisma.liveRoomModerationAction.upsert({
      where: { roomId_userId_type: { roomId, userId, type: 'MUTED' } },
      create: { roomId, userId, type: 'MUTED' },
      update: {},
    });
    return { roomName: room.roomName };
  }

  async unmuteUser(actorId: string, roomId: string, userId: string) {
    const room = await this.getRoom(roomId);
    await this.assertCanModerate(room, actorId);
    await this.prisma.liveRoomModerationAction.deleteMany({
      where: { roomId, userId, type: 'MUTED' },
    });
    return { roomName: room.roomName };
  }

  async kickUser(actorId: string, roomId: string, userId: string) {
    const room = await this.getRoom(roomId);
    await this.assertCanModerate(room, actorId);
    if (userId === room.hostId) throw new BadRequestException("You can't kick the host");
    return { roomName: room.roomName };
  }

  async banUser(actorId: string, roomId: string, userId: string) {
    const room = await this.getRoom(roomId);
    await this.assertCanModerate(room, actorId);
    if (userId === room.hostId) throw new BadRequestException("You can't ban the host");
    await this.prisma.liveRoomModerationAction.upsert({
      where: { roomId_userId_type: { roomId, userId, type: 'BANNED' } },
      create: { roomId, userId, type: 'BANNED' },
      update: {},
    });
    return { roomName: room.roomName };
  }

  async unbanUser(hostId: string, roomId: string, userId: string) {
    const room = await this.getRoom(roomId);
    this.assertHost(room, hostId);
    await this.prisma.liveRoomModerationAction.deleteMany({
      where: { roomId, userId, type: 'BANNED' },
    });
    return { success: true };
  }

  // ── Multi-guest streaming ────────────────────────────────────────────────
  async inviteGuest(hostId: string, roomId: string, guestUserId: string) {
    const room = await this.getRoom(roomId);
    this.assertHost(room, hostId);
    if (guestUserId === hostId)
      throw new BadRequestException("You're already on stage");
    if (!(await this.friendsService.areFriends(hostId, guestUserId)))
      throw new ForbiddenException('You can only invite a friend to go live with you');
    const guest = await this.prisma.liveRoomGuest.upsert({
      where: { roomId_userId: { roomId, userId: guestUserId } },
      create: { roomId, userId: guestUserId, status: 'INVITED' },
      // Re-inviting someone who was removed/declined gives them a fresh invite.
      update: { status: 'INVITED', respondedAt: null },
      include: { user: { select: { id: true, username: true, profile: true } } },
    });
    return { ...guest, roomName: room.roomName };
  }

  async respondGuestInvite(userId: string, roomId: string, accept: boolean) {
    const room = await this.getRoom(roomId);
    const invite = await this.prisma.liveRoomGuest.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!invite || invite.status !== 'INVITED')
      throw new NotFoundException('No pending invite for you in this stream');
    const updated = await this.prisma.liveRoomGuest.update({
      where: { id: invite.id },
      data: { status: accept ? 'ACCEPTED' : 'DECLINED', respondedAt: new Date() },
    });
    return { ...updated, roomName: room.roomName };
  }

  async removeGuest(actorId: string, roomId: string, guestUserId: string) {
    const room = await this.getRoom(roomId);
    await this.assertCanModerate(room, actorId);
    await this.prisma.liveRoomGuest.updateMany({
      where: { roomId, userId: guestUserId, status: { in: ['INVITED', 'ACCEPTED'] } },
      data: { status: 'REMOVED', respondedAt: new Date() },
    });
    return { roomName: room.roomName };
  }

  async listGuests(userId: string, roomId: string) {
    const room = await this.getRoom(roomId);
    await this.assertCanModerate(room, userId);
    return this.prisma.liveRoomGuest.findMany({
      where: { roomId, status: { in: ['INVITED', 'ACCEPTED'] } },
      include: { user: { select: { id: true, username: true, profile: true } } },
      orderBy: { invitedAt: 'asc' },
    });
  }

  // Lets a viewer opening a live room's screen check "am I invited to go
  // on stage here?" so LiveViewerScreen can show an accept/decline banner.
  async getMyGuestInvite(userId: string, roomId: string) {
    return this.prisma.liveRoomGuest.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
  }
}
