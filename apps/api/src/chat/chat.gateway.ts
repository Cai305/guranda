import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma.service';
import { ChatService } from './chat.service';
import { CallService } from '../calls/call.service';
import { sendPushNotification } from '../common/push';
import { NotificationsService } from '../notifications/notifications.service';
import {
  VEMOJI_CATALOG,
  parseVemojiMessage,
  type ChatMessageDto,
  type UserStatus,
  type VemojiType,
} from '@mxit2/types';

const CALL_RING_TIMEOUT_MS = 30_000;

interface PendingCall {
  callerId: string;
  calleeId: string;
  roomName: string;
  accepted: boolean;
  timeout: ReturnType<typeof setTimeout>;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Track connected users: Map<socketId, { userId, status }>
  private connectedUsers = new Map<
    string,
    { userId: string; status: UserStatus }
  >();

  // Ephemeral — a call is either ringing/active right now or it isn't, no
  // need to survive a server restart the way chat messages do.
  private pendingCalls = new Map<string, PendingCall>();

  constructor(
    private prisma: PrismaService,
    private chatService: ChatService,
    private callService: CallService,
    private notifications: NotificationsService,
  ) {}

  handleDisconnect(client: Socket) {
    const user = this.connectedUsers.get(client.id);
    if (user) {
      this.connectedUsers.delete(client.id);
      this.server.emit('user_status_changed', {
        userId: user.userId,
        status: 'offline',
      });

      // If this user drops mid-call, tell the other party rather than
      // leaving them ringing/connected forever with no signal.
      for (const [callId, call] of this.pendingCalls.entries()) {
        if (call.callerId === user.userId || call.calleeId === user.userId) {
          const otherId =
            call.callerId === user.userId ? call.calleeId : call.callerId;
          this.emitToUser(otherId, 'call_ended', { callId });
          this.cleanupCall(callId);
        }
      }
    }
  }

  private emitToUser(userId: string, event: string, payload: any) {
    for (const [socketId, info] of this.connectedUsers.entries()) {
      if (info.userId === userId) this.server.to(socketId).emit(event, payload);
    }
  }

  // Chats created via the REST endpoints (ChatController) only reach here
  // after the fact — a member who was already connected before the chat
  // existed never auto-joined its Socket.IO room (that only happens once,
  // in handleSetStatus, off their membership list at connect time). Without
  // this, the *other* side of a brand-new chat misses every 'new_message'
  // broadcast for it until they reconnect, so their chat-list envelope never
  // goes gold in realtime. Called by ChatController right after a chat is
  // created, for every member who's currently connected.
  joinUserSockets(userId: string, chatId: string) {
    for (const [socketId, info] of this.connectedUsers.entries()) {
      if (info.userId === userId)
        this.server.sockets.sockets.get(socketId)?.join(chatId);
    }
  }

  private cleanupCall(callId: string) {
    const call = this.pendingCalls.get(callId);
    if (!call) return;
    clearTimeout(call.timeout);
    this.pendingCalls.delete(callId);
    this.callService.endCall(call.roomName).catch(() => {});
  }

  @SubscribeMessage('set_status')
  async handleSetStatus(
    @MessageBody() data: { userId: string; status: UserStatus },
    @ConnectedSocket() client: Socket,
  ) {
    this.connectedUsers.set(client.id, {
      userId: data.userId,
      status: data.status,
    });
    this.server.emit('user_status_changed', {
      userId: data.userId,
      status: data.status,
    });

    // Automatically join all chat rooms this user is a member of
    const memberships = await this.prisma.chatMember.findMany({
      where: { userId: data.userId },
      select: { chatId: true },
    });
    for (const mem of memberships) {
      client.join(mem.chatId);
    }
  }

  @SubscribeMessage('get_online_users')
  handleGetOnlineUsers(@ConnectedSocket() client: Socket) {
    const onlineUsers = Array.from(this.connectedUsers.values());
    client.emit('online_users_list', onlineUsers);
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.chatId);
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @MessageBody() dto: ChatMessageDto,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    try {
      // 1. Save message via the shared ChatService (same path the
      // chat.sendMessage AI tool uses)
      const savedMessage = await this.chatService.sendMessage(
        dto.senderId,
        dto.chatId,
        dto.content,
        dto.mediaUrl,
        dto.replyToId,
      );

      const responseDto: ChatMessageDto = {
        id: savedMessage.id,
        chatId: savedMessage.chatId,
        senderId: savedMessage.senderId,
        content: savedMessage.content,
        mediaUrl: savedMessage.mediaUrl || undefined,
        replyToId: savedMessage.replyToId || undefined,
        replyTo: savedMessage.replyTo,
        createdAt: savedMessage.createdAt,
      };

      // 2. Broadcast to everyone in the room
      this.server.to(dto.chatId).emit('new_message', responseDto);

      // 3. Push-notify the other members — covers the case where their
      // socket missed the broadcast (backgrounded/disconnected), and gives
      // Vemoji-only messages (raw content is just "vemoji:fire") readable
      // notification text instead of the encoded string.
      this.notifyChatMembers(
        dto.chatId,
        dto.senderId,
        dto.content,
        dto.mediaUrl,
      ).catch((e) => console.error('Failed to push-notify chat members:', e));
    } catch (e: any) {
      console.error('Failed to save message:', e);
      client.emit('message_error', {
        chatId: dto.chatId,
        message: e?.message || 'Failed to send message',
      });
    }
  }

  // Copies an existing message into one or more other chats the caller is a
  // member of — same broadcast + push-notify path as a fresh send_message,
  // so the recipients see it land in realtime exactly like any other message.
  @SubscribeMessage('forward_message')
  async handleForward(
    @MessageBody()
    data: { userId: string; messageId: string; targetChatIds: string[] },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    try {
      const created = await this.chatService.forwardMessage(
        data.userId,
        data.messageId,
        data.targetChatIds,
      );

      for (const msg of created) {
        const responseDto: ChatMessageDto = {
          id: msg.id,
          chatId: msg.chatId,
          senderId: msg.senderId,
          content: msg.content,
          mediaUrl: msg.mediaUrl || undefined,
          isForwarded: true,
          createdAt: msg.createdAt,
        };
        this.server.to(msg.chatId).emit('new_message', responseDto);
        this.notifyChatMembers(msg.chatId, msg.senderId, msg.content, msg.mediaUrl || undefined).catch((e) =>
          console.error('Failed to push-notify chat members:', e),
        );
      }

      client.emit('forward_ack', { ok: true, count: created.length });
    } catch (e) {
      console.error('Failed to forward message:', e);
      client.emit('forward_ack', { ok: false, error: e.message || 'Forward failed' });
    }
  }

  private async notifyChatMembers(
    chatId: string,
    senderId: string,
    content: string,
    mediaUrl?: string,
  ) {
    const [members, senderName] = await Promise.all([
      this.chatService.getMembersForNotification(chatId, senderId),
      this.chatService.getDisplayName(senderId),
    ]);
    if (members.length === 0) return;

    const vemojiType = parseVemojiMessage(content);
    const body = vemojiType
      ? `${VEMOJI_CATALOG.find((v) => v.type === vemojiType)?.fallbackEmoji ?? ''} Sent a Vemoji`.trim()
      : content || (mediaUrl ? '📎 Sent an attachment' : '');

    for (const member of members) {
      const token = member.user.expoPushToken;
      if (token) {
        await sendPushNotification(token, senderName, body, {
          type: 'chat_message',
          chatId,
        });
      }
      await this.notifications.create(member.userId, 'chat.message', senderName, body, { chatId });
    }
  }

  // ── 1:1 calling ──────────────────────────────────────────────────────────
  // Ring/accept/decline/end all go through this same socket the rest of chat
  // already uses — no separate signaling channel. The actual audio/video
  // never touches this server; it only hands out short-lived LiveKit tokens
  // and relays call state between the two participants' sockets.

  @SubscribeMessage('call_invite')
  async handleCallInvite(
    @MessageBody()
    data: {
      callerId: string;
      callerName: string;
      targetUserId: string;
      video: boolean;
    },
    @ConnectedSocket() client: Socket,
  ) {
    if (data.callerId === data.targetUserId) return;

    const callee = await this.prisma.user.findUnique({
      where: { id: data.targetUserId },
      select: { username: true, profile: { select: { displayName: true } } },
    });
    if (!callee) {
      client.emit('call_failed', { reason: 'That user could not be found.' });
      return;
    }
    const isCalleeOnline = Array.from(this.connectedUsers.values()).some(
      (u) => u.userId === data.targetUserId,
    );
    if (!isCalleeOnline) {
      client.emit('call_failed', {
        reason: `${callee.profile?.displayName || callee.username} is offline right now.`,
      });
      return;
    }

    const calleeName = callee.profile?.displayName || callee.username;
    let roomName: string,
      wsUrl: string,
      callerToken: string,
      calleeToken: string;
    try {
      ({ roomName, wsUrl, callerToken, calleeToken } =
        await this.callService.createCall(
          data.callerId,
          data.callerName,
          data.targetUserId,
          calleeName,
        ));
    } catch (e) {
      // Without this, a LiveKit outage leaves the caller's client hanging
      // forever with no signal at all — silently indistinguishable from a
      // slow network. Always let them know it failed instead of just
      // dropping the invite.
      console.error('call_invite: failed to create LiveKit room:', e);
      client.emit('call_failed', {
        reason: 'Could not start the call right now. Please try again shortly.',
      });
      return;
    }

    const callId = randomUUID();
    const timeout = setTimeout(() => {
      this.emitToUser(data.callerId, 'call_ended', {
        callId,
        reason: 'missed',
      });
      this.emitToUser(data.targetUserId, 'call_ended', {
        callId,
        reason: 'missed',
      });
      this.cleanupCall(callId);
    }, CALL_RING_TIMEOUT_MS);

    this.pendingCalls.set(callId, {
      callerId: data.callerId,
      calleeId: data.targetUserId,
      roomName,
      accepted: false,
      timeout,
    });

    this.emitToUser(data.targetUserId, 'call_incoming', {
      callId,
      roomName,
      wsUrl,
      token: calleeToken,
      callerId: data.callerId,
      callerName: data.callerName,
      video: data.video,
    });
    client.emit('call_ringing', {
      callId,
      roomName,
      wsUrl,
      token: callerToken,
    });
  }

  @SubscribeMessage('call_accept')
  handleCallAccept(@MessageBody() data: { callId: string }) {
    const call = this.pendingCalls.get(data.callId);
    if (!call) return;
    call.accepted = true;
    this.emitToUser(call.callerId, 'call_accepted', { callId: data.callId });
  }

  @SubscribeMessage('call_decline')
  handleCallDecline(@MessageBody() data: { callId: string }) {
    const call = this.pendingCalls.get(data.callId);
    if (!call) return;
    this.emitToUser(call.callerId, 'call_ended', {
      callId: data.callId,
      reason: 'declined',
    });
    this.cleanupCall(data.callId);
  }

  @SubscribeMessage('call_end')
  handleCallEnd(
    @MessageBody() data: { callId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const call = this.pendingCalls.get(data.callId);
    if (!call) return;
    const requester = this.connectedUsers.get(client.id)?.userId;
    const otherId = requester === call.callerId ? call.calleeId : call.callerId;
    this.emitToUser(otherId, 'call_ended', {
      callId: data.callId,
      reason: 'ended',
    });
    this.cleanupCall(data.callId);
  }

  // Vemoji reactions during an active call — relayed peer-to-peer over the
  // same signaling socket, not persisted anywhere. Only valid once the call
  // has actually been accepted (pendingCalls keeps the entry, with
  // accepted:true, for the call's whole duration — see cleanupCall).
  @SubscribeMessage('call_reaction')
  handleCallReaction(
    @MessageBody() data: { callId: string; type: VemojiType },
    @ConnectedSocket() client: Socket,
  ) {
    const call = this.pendingCalls.get(data.callId);
    if (!call || !call.accepted) return;
    const requester = this.connectedUsers.get(client.id)?.userId;
    if (!requester) return;
    const otherId = requester === call.callerId ? call.calleeId : call.callerId;
    this.emitToUser(otherId, 'call_reaction', {
      callId: data.callId,
      type: data.type,
    });
  }
}
