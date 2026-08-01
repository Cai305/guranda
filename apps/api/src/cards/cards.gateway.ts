import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CardsService, CardGameMode } from './cards.service';
import { PrismaService } from '../prisma.service';
import { FriendsService } from '../friends/friends.service';
import { sendPushNotification } from '../common/push';
import { Card, CassinoMatchMode } from '@mxit2/types';

const AI_STEP_DELAY_MS = 1200;
const TURN_TIMEOUT_MS = 45_000;

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/cards' })
export class CardsGateway implements OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  // gameId -> userId -> socketId, for per-seat sanitized targeting.
  private gameSockets = new Map<string, Map<string, string>>();
  // gameId -> spectator socketIds. Spectator sockets never get their action
  // events processed (see the guard at the top of each action handler).
  private spectatorSockets = new Map<string, Set<string>>();
  private aiRunning = new Set<string>();
  private turnTimers = new Map<string, ReturnType<typeof setTimeout>>();
  // roomId -> userId -> { displayName, avatarUrl, socketId } — the pre-game
  // lobby roster. CardRoom itself only persists settings/status, not who has
  // joined; that's ephemeral, tracked here exactly like gameSockets above.
  // avatarUrl is client-supplied at join (from their own AuthContext), same
  // trust level as displayName — good enough for a cosmetic lobby/seat photo.
  private roomParticipants = new Map<string, Map<string, { displayName: string; avatarUrl?: string; socketId: string }>>();

  constructor(
    private readonly cards: CardsService,
    private prisma: PrismaService,
    private friends: FriendsService,
  ) {}

  handleDisconnect(client: Socket) {
    this.cards.removeFromQueue(client.id);
  }

  private async broadcastRoom(roomId: string) {
    const room = await this.cards.getRoom(roomId);
    if (!room) return;
    const participants = [...(this.roomParticipants.get(roomId)?.entries() ?? [])].map(([userId, p]) => ({
      userId,
      displayName: p.displayName,
      avatarUrl: p.avatarUrl,
    }));
    this.server.to(roomId).emit('room_updated', { ...room, participants });
  }

  private isSpectator(gameId: string, socketId: string): boolean {
    return this.spectatorSockets.get(gameId)?.has(socketId) ?? false;
  }

  private async broadcastGame(gameId: string, game: any) {
    const sockets = this.gameSockets.get(gameId);
    const seats = game.seats as any[];
    if (sockets) {
      for (const [userId, socketId] of sockets) {
        const seat = seats.find((s) => s.userId === userId);
        const payload = seat
          ? this.cards.sanitizeGameForSeat(game, seat.seatIndex)
          : this.cards.sanitizeGameForSpectator(game);
        this.server.to(socketId).emit('game_updated', payload);
      }
    }
    const spectators = this.spectatorSockets.get(gameId);
    if (spectators) {
      const spectatorPayload = this.cards.sanitizeGameForSpectator(game);
      for (const socketId of spectators) {
        this.server.to(socketId).emit('game_updated', spectatorPayload);
      }
    }
    this.armTurnTimer(gameId, game);
  }

  // ---- Turn timer: server-authoritative, never trusts a client-reported timeout ----

  private armTurnTimer(gameId: string, game: any) {
    const existing = this.turnTimers.get(gameId);
    if (existing) clearTimeout(existing);
    if (game.status !== 'active') return;

    const timer = setTimeout(async () => {
      const current = await this.cards.getGame(gameId);
      if (!current || current.status !== 'active') return;
      const seats = current.seats as any[];
      const state = current.state as any;
      const seatIndex = state.currentSeat;
      const seat = seats[seatIndex];
      if (!seat) return;

      let result: any = null;
      if (current.mode === 'FIVE_CARDS') {
        if (state.turnPhase === 'draw') {
          result = await this.cards.fiveCardsDraw(gameId, seat.userId ?? '');
        } else {
          const hand = state.seats[seatIndex].hand as Card[];
          result = hand[0]
            ? await this.cards.fiveCardsDiscard(gameId, seat.userId ?? '', hand[0])
            : null;
        }
      } else {
        const hand = state.seats[seatIndex].hand as Card[];
        if (hand[0]) {
          result = await this.cards.cassinoPlay(gameId, seat.userId ?? '', 'trail', hand[0]);
        }
      }
      this.server.to(gameId).emit('turn_timer_expired', { gameId, seatIndex });
      if (result?.game) await this.broadcastGame(gameId, result.game);
      this.maybeRunAI(gameId, result?.game ?? current);
    }, TURN_TIMEOUT_MS);
    this.turnTimers.set(gameId, timer);
  }

  // ---- Matchmaking / vs AI ----

  @SubscribeMessage('join_queue')
  async handleJoinQueue(
    @MessageBody() data: { mode: CardGameMode; userId: string; displayName: string },
    @ConnectedSocket() client: Socket,
  ) {
    const result = this.cards.joinQueue(data.mode, data.userId, data.displayName, client.id);
    if (result.matchFound) {
      const seats = result.players.map((p) => ({ userId: p.userId, displayName: p.displayName, isAI: false }));
      const game =
        data.mode === 'FIVE_CARDS'
          ? await this.cards.createFiveCardsGame(seats, result.players[0].userId)
          : await this.cards.createCassinoGame(seats, result.players[0].userId, { cassinoMode: 'ONE_V_ONE' });
      result.players.forEach((p) => this.server.to(p.socketId).emit('match_found', { gameId: game.id }));
    }
  }

  @SubscribeMessage('leave_queue')
  handleLeaveQueue(@ConnectedSocket() client: Socket) {
    this.cards.removeFromQueue(client.id);
  }

  @SubscribeMessage('start_ai_game')
  async handleStartAIGame(
    @MessageBody()
    data: {
      mode: CardGameMode;
      userId: string;
      displayName: string;
      difficulty: 'easy' | 'medium' | 'hard';
      jokersEnabled?: boolean;
      cassinoMode?: CassinoMatchMode;
      targetScore?: number;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const game = await this.cards.startAIGame(data.mode, data.userId, data.displayName, data.difficulty, {
      jokersEnabled: data.jokersEnabled,
      cassinoMode: data.cassinoMode,
      targetScore: data.targetScore,
    });
    client.emit('game_created', { gameId: game.id });
  }

  // ---- Rooms ----

  @SubscribeMessage('create_room')
  async handleCreateRoom(
    @MessageBody()
    data: {
      hostId: string;
      hostDisplayName: string;
      hostAvatarUrl?: string;
      mode: CardGameMode;
      isPrivate: boolean;
      maxSeats?: number;
      settings?: any;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const room = await this.cards.createRoom(
      data.hostId,
      data.mode,
      !!data.isPrivate,
      data.maxSeats ?? 4,
      data.settings ?? {},
    );
    await this.joinRoomInternal(room.id, data.hostId, data.hostDisplayName, data.hostAvatarUrl, client);
    client.emit('room_created', { roomId: room.id, roomCode: room.roomCode });
  }

  @SubscribeMessage('join_room_by_code')
  async handleJoinRoomByCode(
    @MessageBody() data: { roomCode: string; userId: string; displayName: string; avatarUrl?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = await this.cards.getRoomByCode(data.roomCode);
    if (!room || room.status !== 'waiting') {
      client.emit('invalid_action', { reason: 'Room not found or already started' });
      return;
    }
    this.joinRoomInternal(room.id, data.userId, data.displayName, data.avatarUrl, client);
    client.emit('room_joined', { roomId: room.id });
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @MessageBody() data: { roomId: string; userId: string; displayName: string; avatarUrl?: string },
    @ConnectedSocket() client: Socket,
  ) {
    await this.joinRoomInternal(data.roomId, data.userId, data.displayName, data.avatarUrl, client);
  }

  private async joinRoomInternal(roomId: string, userId: string, displayName: string, avatarUrl: string | undefined, client: Socket) {
    client.join(roomId);
    let participants = this.roomParticipants.get(roomId);
    if (!participants) {
      participants = new Map();
      this.roomParticipants.set(roomId, participants);
    }
    participants.set(userId, { displayName, avatarUrl, socketId: client.id });
    await this.broadcastRoom(roomId);
  }

  @SubscribeMessage('start_room_game')
  async handleStartRoomGame(
    @MessageBody() data: { roomId: string; hostId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = await this.cards.getRoom(data.roomId);
    if (!room || room.hostId !== data.hostId || room.status !== 'waiting') {
      client.emit('invalid_action', { reason: 'Only the host can start this room' });
      return;
    }
    const participants = [...(this.roomParticipants.get(data.roomId)?.entries() ?? [])];
    if (participants.length < 2) {
      client.emit('invalid_action', { reason: 'Need at least 2 players to start' });
      return;
    }
    const seats = participants.map(([userId, p]) => ({ userId, displayName: p.displayName, isAI: false }));
    const settings = room.settings as any;
    const game =
      room.mode === 'FIVE_CARDS'
        ? await this.cards.createFiveCardsGame(seats, data.hostId, {
            jokersEnabled: !!settings?.jokersEnabled,
            roomId: room.id,
          })
        : await this.cards.createCassinoGame(seats, data.hostId, {
            cassinoMode: settings?.cassinoMode ?? 'ONE_V_ONE',
            targetScore: settings?.targetScore ?? 11,
            roomId: room.id,
          });
    await this.prisma.cardRoom.update({ where: { id: room.id }, data: { status: 'active' } });
    this.server.to(room.id).emit('room_game_started', { gameId: game.id });
  }

  @SubscribeMessage('invite_friend_to_room')
  async handleInviteFriend(
    @MessageBody() data: { roomId: string; requesterId: string; friendUserId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const isFriend = await this.friends.areFriends(data.requesterId, data.friendUserId);
    if (!isFriend) {
      client.emit('invalid_action', { reason: 'You can only invite an accepted friend' });
      return;
    }
    const friend = await this.prisma.user.findUnique({ where: { id: data.friendUserId } });
    const room = await this.cards.getRoom(data.roomId);
    if (friend?.expoPushToken && room) {
      await sendPushNotification(
        friend.expoPushToken,
        'Game invite',
        `You've been invited to a ${room.mode === 'FIVE_CARDS' ? '5 Cards' : 'Cassino'} room`,
        { deepLink: `guranda://cards/join/${room.roomCode}` },
      );
    }
    this.server.to(data.roomId).emit('friend_invited_you', { friendUserId: data.friendUserId });
  }

  @SubscribeMessage('spectate_game')
  async handleSpectate(@MessageBody() data: { gameId: string }, @ConnectedSocket() client: Socket) {
    client.join(data.gameId);
    let set = this.spectatorSockets.get(data.gameId);
    if (!set) {
      set = new Set();
      this.spectatorSockets.set(data.gameId, set);
    }
    set.add(client.id);
    const game = await this.cards.getGame(data.gameId);
    if (game) client.emit('game_updated', this.cards.sanitizeGameForSpectator(game));
  }

  @SubscribeMessage('join_game')
  async handleJoinGame(@MessageBody() data: { gameId: string; userId: string }, @ConnectedSocket() client: Socket) {
    client.join(data.gameId);
    let sockets = this.gameSockets.get(data.gameId);
    if (!sockets) {
      sockets = new Map();
      this.gameSockets.set(data.gameId, sockets);
    }
    sockets.set(data.userId, client.id);

    const game = await this.cards.getGame(data.gameId);
    if (!game) return;
    const seatIndex = this.cards.seatOf(game, data.userId);
    if (seatIndex !== null) {
      client.emit('game_updated', this.cards.sanitizeGameForSeat(game, seatIndex));
    }
    this.armTurnTimer(data.gameId, game);
    this.maybeRunAI(data.gameId, game);
  }

  // ---- Ephemeral in-room chat & reactions (not persisted to Chat/Message) ----

  @SubscribeMessage('send_room_message')
  handleRoomMessage(
    @MessageBody() data: { roomId: string; userId: string; displayName: string; content: string },
  ) {
    this.server.to(data.roomId).emit('room_message', {
      userId: data.userId,
      displayName: data.displayName,
      content: data.content,
      at: Date.now(),
    });
  }

  @SubscribeMessage('send_reaction')
  handleReaction(@MessageBody() data: { roomId: string; userId: string; emoji: string }) {
    this.server.to(data.roomId).emit('room_reaction', { userId: data.userId, emoji: data.emoji, at: Date.now() });
  }

  // ---- 5 Cards actions ----

  @SubscribeMessage('fivecards_draw')
  async handleFiveCardsDraw(@MessageBody() data: { gameId: string; userId: string }, @ConnectedSocket() client: Socket) {
    if (this.isSpectator(data.gameId, client.id)) {
      client.emit('invalid_action', { reason: 'Spectators cannot act' });
      return;
    }
    const result = await this.cards.fiveCardsDraw(data.gameId, data.userId);
    if (!result || (result as any).error) {
      client.emit('invalid_action', { reason: (result as any)?.error ?? 'draw' });
      return;
    }
    await this.broadcastGame(data.gameId, (result as any).game);
  }

  @SubscribeMessage('fivecards_take_discard')
  async handleFiveCardsTakeDiscard(
    @MessageBody() data: { gameId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (this.isSpectator(data.gameId, client.id)) {
      client.emit('invalid_action', { reason: 'Spectators cannot act' });
      return;
    }
    const result = await this.cards.fiveCardsTakeDiscard(data.gameId, data.userId);
    if (!result || (result as any).error) {
      client.emit('invalid_action', { reason: (result as any)?.error ?? 'takeDiscard' });
      return;
    }
    await this.broadcastGame(data.gameId, (result as any).game);
  }

  @SubscribeMessage('fivecards_discard')
  async handleFiveCardsDiscard(
    @MessageBody() data: { gameId: string; userId: string; card: Card },
    @ConnectedSocket() client: Socket,
  ) {
    if (this.isSpectator(data.gameId, client.id)) {
      client.emit('invalid_action', { reason: 'Spectators cannot act' });
      return;
    }
    const result = await this.cards.fiveCardsDiscard(data.gameId, data.userId, data.card);
    if (!result || (result as any).error) {
      client.emit('invalid_action', { reason: (result as any)?.error ?? 'discard' });
      return;
    }
    await this.broadcastGame(data.gameId, (result as any).game);
    this.maybeRunAI(data.gameId, (result as any).game);
  }

  // ---- Cassino actions ----

  @SubscribeMessage('cassino_play')
  async handleCassinoPlay(
    @MessageBody()
    data: {
      gameId: string;
      userId: string;
      card: Card;
      action: 'capture' | 'build' | 'trail' | 'extendBuild' | 'takeOverBuild';
      targetIds?: string[];
      buildValue?: number;
    },
    @ConnectedSocket() client: Socket,
  ) {
    if (this.isSpectator(data.gameId, client.id)) {
      client.emit('invalid_action', { reason: 'Spectators cannot act' });
      return;
    }
    const result = await this.cards.cassinoPlay(
      data.gameId,
      data.userId,
      data.action,
      data.card,
      data.targetIds ?? [],
      data.buildValue,
    );
    if (!result || (result as any).error) {
      client.emit('invalid_action', { reason: (result as any)?.error ?? data.action });
      return;
    }
    await this.broadcastGame(data.gameId, (result as any).game);
    this.maybeRunAI(data.gameId, (result as any).game);
  }

  // ---- AI turn loop (shared by both games) ----

  private async maybeRunAI(gameId: string, game: any) {
    if (!game || game.status !== 'active') return;
    const aiSeat = this.cards.aiSeatIndex(game);
    if (aiSeat === null) return;
    if (game.state.currentSeat !== aiSeat) return;
    if (this.aiRunning.has(gameId)) return;

    this.aiRunning.add(gameId);
    try {
      await new Promise((resolve) => setTimeout(resolve, AI_STEP_DELAY_MS));
      const updated =
        game.mode === 'FIVE_CARDS'
          ? await this.cards.playFiveCardsAITurn(gameId)
          : await this.cards.playCassinoAITurn(gameId);
      if (updated?.game) {
        await this.broadcastGame(gameId, updated.game);
        // Cassino AI may need to act again immediately if its turn continues
        // (e.g. after a redeal or an intermediate build step in future rules).
        if (updated.game.state.currentSeat === aiSeat && updated.game.status === 'active') {
          this.aiRunning.delete(gameId);
          await this.maybeRunAI(gameId, updated.game);
          return;
        }
      }
    } finally {
      this.aiRunning.delete(gameId);
    }
  }
}
