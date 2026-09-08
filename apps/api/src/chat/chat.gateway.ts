import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma.service';
import { ChatService } from './chat.service';
import { CallService } from '../calls/call.service';
import { sendCategorizedPush } from '../common/push';
import { NotificationsService } from '../notifications/notifications.service';
import { BlocksService } from '../blocks/blocks.service';
import {
  VEMOJI_CATALOG,
  parseVemojiMessage,
  type ChatMessageDto,
  type UserStatus,
  type VemojiType,
} from '@mxit2/types';

const CALL_RING_TIMEOUT_MS = 30_000;

interface PendingCall {
  callId: string;
  callerId: string;
  calleeId: string;
  roomName: string;
  accepted: boolean;
  timeout: ReturnType<typeof setTimeout>;
}

interface PendingGroupCall {
  callId: string;
  callerId: string;
  chatId: string;
  roomName: string;
  type: 'voice' | 'video';
  // Ring timeout per still-ringing invitee — cleared the moment they
  // join/decline, or fired after CALL_RING_TIMEOUT_MS to mark them missed.
  ringTimeouts: Map<string, ReturnType<typeof setTimeout>>;
  // Everyone actually in the LiveKit room right now, caller included the
  // moment they create the call — the call ends when this hits empty.
  connected: Set<string>;
  // Everyone who was ever invited (caller included) — used to notify
  // overlays app-wide when the whole call ends, not just active participants.
  everyone: Set<string>;
  // Flips true the first time anyone besides the caller actually joins —
  // decides whether an empty call ends as 'completed' or 'missed'.
  anyGuestJoined: boolean;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Track connected users: Map<socketId, { userId, status, activityLabel }>
  private connectedUsers = new Map<
    string,
    { userId: string; status: UserStatus; activityLabel?: string | null }
  >();

  // Ephemeral — a call is either ringing/active right now or it isn't, no
  // need to survive a server restart the way chat messages do.
  private pendingCalls = new Map<string, PendingCall>();
  private groupCalls = new Map<string, PendingGroupCall>();

  constructor(
    private prisma: PrismaService,
    private chatService: ChatService,
    private callService: CallService,
    private notifications: NotificationsService,
    private blocks: BlocksService,
  ) {}

  handleDisconnect(client: Socket) {
    const user = this.connectedUsers.get(client.id);
    if (user) {
      this.connectedUsers.delete(client.id);
      this.server.emit('user_status_changed', {
        userId: user.userId,
        status: 'offline',
      });

      // "Last seen" should reflect this user's last real disconnect, not
      // flicker on every closed tab/reconnect — only write it once none of
      // their other devices/tabs are still connected.
      const stillConnectedElsewhere = Array.from(this.connectedUsers.values()).some(
        (u) => u.userId === user.userId,
      );
      if (!stillConnectedElsewhere) {
        this.prisma.user
          .update({ where: { id: user.userId }, data: { lastSeenAt: new Date() } })
          .catch((e) => console.error('Failed to record lastSeenAt:', e));
      }

      // If this user drops mid-call, tell the other party rather than
      // leaving them ringing/connected forever with no signal, and close
      // out the persisted Call row so it doesn't sit stuck as "ringing"/
      // "ongoing" forever.
      for (const [callId, call] of this.pendingCalls.entries()) {
        if (call.callerId === user.userId || call.calleeId === user.userId) {
          const otherId =
            call.callerId === user.userId ? call.calleeId : call.callerId;
          this.emitToUser(otherId, 'call_ended', { callId });
          this.callService
            .markEnded(call.callId, call.accepted ? 'completed' : 'missed')
            .catch((e) => console.error('Failed to record call end:', e));
          this.cleanupCall(callId);
        }
      }

      // Same idea for a group call — a dropped socket mid-call is exactly a
      // group_call_leave (still-ringing) or a departure (already connected).
      for (const [callId, groupCall] of this.groupCalls.entries()) {
        if (groupCall.everyone.has(user.userId)) {
          const reason = groupCall.connected.has(user.userId) ? 'left' : 'missed';
          this.handleGroupParticipantGone(callId, user.userId, reason);
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

  // Shared by an explicit decline/leave and a mid-call disconnect — one
  // person leaving the group call. Ends the whole call once nobody's left
  // in it; otherwise just tells whoever remains.
  private handleGroupParticipantGone(callId: string, userId: string, reason: 'left' | 'missed' | 'declined') {
    const call = this.groupCalls.get(callId);
    if (!call) return;
    call.connected.delete(userId);
    const timeout = call.ringTimeouts.get(userId);
    if (timeout) {
      clearTimeout(timeout);
      call.ringTimeouts.delete(userId);
    }
    this.callService
      .setParticipantStatus(callId, userId, reason)
      .catch((e) => console.error('Failed to record group call participant status:', e));

    if (call.connected.size === 0) {
      for (const memberId of call.everyone) {
        if (memberId !== userId) this.emitToUser(memberId, 'group_call_ended', { callId, reason: 'ended' });
      }
      this.callService
        .markEnded(callId, call.anyGuestJoined ? 'completed' : 'missed')
        .catch((e) => console.error('Failed to record group call end:', e));
      this.callService.endCall(call.roomName).catch(() => {});
      for (const t of call.ringTimeouts.values()) clearTimeout(t);
      this.groupCalls.delete(callId);
      return;
    }

    for (const memberId of call.connected) {
      this.emitToUser(memberId, 'group_call_participant_left', { callId, userId, reason });
    }
  }

  @SubscribeMessage('set_status')
  async handleSetStatus(
    @MessageBody() data: { userId: string; status: UserStatus; activityLabel?: string | null },
    @ConnectedSocket() client: Socket,
  ) {
    // Never trust the client's word alone on whether to reveal activity —
    // a client could be modified to send a label regardless of the user's
    // actual privacy setting, so re-check the DB flag server-side before
    // storing or broadcasting anything.
    let activityLabel: string | null = null;
    if (data.activityLabel) {
      const row = await this.prisma.user.findUnique({
        where: { id: data.userId },
        select: { shareLiveActivity: true },
      });
      if (row?.shareLiveActivity) activityLabel = data.activityLabel;
    }

    this.connectedUsers.set(client.id, {
      userId: data.userId,
      status: data.status,
      activityLabel,
    });
    this.server.emit('user_status_changed', {
      userId: data.userId,
      status: data.status,
      activityLabel,
    });

    // Automatically join all chat rooms this user is a member of, plus any
    // chat a relationship partner has shared with them as a delegate — a
    // delegate has no ChatMember row, so without this their socket would
    // never join that chat's room and they'd miss realtime delivery.
    const [memberships, delegatedShares] = await Promise.all([
      this.prisma.chatMember.findMany({
        where: { userId: data.userId },
        select: { chatId: true },
      }),
      this.prisma.chatShare.findMany({
        where: { delegateId: data.userId },
        select: { chatId: true },
      }),
    ]);
    for (const mem of memberships) {
      client.join(mem.chatId);
    }
    for (const share of delegatedShares) {
      client.join(share.chatId);
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

  // Ephemeral, no persistence — same "just relay it" shape as call_reaction.
  // client.to() (not this.server.to()) so the typer never gets their own
  // event echoed back.
  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { chatId: string; userId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(data.chatId).emit('user_typing', {
      chatId: data.chatId,
      userId: data.userId,
      isTyping: data.isTyping,
    });
  }

  // Called by ChatController.getChatMessages right after it marks the
  // caller's own read position — lets the OTHER participant's open thread
  // flip their sent messages to "seen" live, instead of only on next open.
  notifyRead(chatId: string, userId: string) {
    this.server.to(chatId).emit('messages_read', {
      chatId,
      userId,
      readAt: new Date(),
    });
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
      // notification text instead of the encoded string. Uses
      // savedMessage.senderId (the DISPLAY sender), not dto.senderId (the
      // real caller) — when a delegate sent this, dto.senderId is their own
      // id, which is never a ChatMember of this chat and must never be the
      // name shown in the notification (that would out the delegate to the
      // chat's other participant).
      this.notifyChatMembers(
        dto.chatId,
        savedMessage.senderId,
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
    const [members, delegates, senderName] = await Promise.all([
      this.chatService.getMembersForNotification(chatId, senderId),
      // A delegate a chat is shared with is never a ChatMember, so without
      // this they'd get no push/in-app notification at all when a message
      // lands in a chat they're actively reading/replying in — this is the
      // concrete fix for "messages should connect directly with my device"
      // for the shared-chat case.
      this.chatService.getDelegatesForNotification(chatId, senderId),
      this.chatService.getDisplayName(senderId),
    ]);
    if (members.length === 0 && delegates.length === 0) return;

    const vemojiType = parseVemojiMessage(content);
    const body = vemojiType
      ? `${VEMOJI_CATALOG.find((v) => v.type === vemojiType)?.fallbackEmoji ?? ''} Sent a Vemoji`.trim()
      : content || (mediaUrl ? '📎 Sent an attachment' : '');

    for (const member of members) {
      // Muted: still recorded as an in-app Notification (nothing is lost),
      // just no push alert/sound — same convention as every other
      // mute-a-thread feature.
      const isMuted = !!member.mutedUntil && member.mutedUntil > new Date();
      const token = member.user.expoPushToken;
      if (token && !isMuted) {
        await sendCategorizedPush(this.prisma, member.userId, 'messages', token, senderName, body, {
          type: 'chat_message',
          chatId,
        });
      }
      await this.notifications.create(member.userId, 'chat.message', senderName, body, { chatId });
    }
    // A delegate reads this chat AS the owner, so the notification reads
    // exactly like it would for the owner themselves ("message from
    // {senderName}") — nothing here reveals the delegate relationship.
    for (const share of delegates) {
      const token = share.delegate.expoPushToken;
      if (token) {
        await sendCategorizedPush(this.prisma, share.delegateId, 'messages', token, senderName, body, { type: 'chat_message', chatId });
      }
      await this.notifications.create(share.delegateId, 'chat.message', senderName, body, { chatId });
    }
  }

  // ── Edit / delete ────────────────────────────────────────────────────────

  @SubscribeMessage('edit_message')
  async handleEditMessage(
    @MessageBody() data: { userId: string; messageId: string; content: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    try {
      const updated = await this.chatService.editMessage(data.userId, data.messageId, data.content);
      // Explicit whitelist, not a spread of `updated` — same reasoning as
      // handleMessage's responseDto: actualSenderId must never reach the
      // room broadcast (every recipient gets the identical payload), or
      // the chat's other participant would learn a delegate edited this
      // message "as" the owner, breaking the fully-invisible requirement.
      this.server.to(updated.chatId).emit('message_updated', {
        id: updated.id,
        chatId: updated.chatId,
        senderId: updated.senderId,
        content: updated.content,
        mediaUrl: updated.mediaUrl || undefined,
        editedAt: updated.editedAt,
      });
    } catch (e: any) {
      client.emit('message_error', {
        chatId: undefined,
        message: e?.message || 'Failed to edit message',
      });
    }
  }

  @SubscribeMessage('delete_message')
  async handleDeleteMessage(
    @MessageBody() data: { userId: string; messageId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    try {
      const result = await this.chatService.deleteMessage(data.userId, data.messageId);
      this.server.to(result.chatId).emit('message_deleted', result);
    } catch (e: any) {
      client.emit('message_error', {
        chatId: undefined,
        message: e?.message || 'Failed to delete message',
      });
    }
  }

  // ── Pinned messages ──────────────────────────────────────────────────────
  // Same shape as edit_message/delete_message: a socket round-trip so both
  // participants' threads update the pinned bar live, not just on refresh.

  @SubscribeMessage('pin_message')
  async handlePinMessage(
    @MessageBody() data: { userId: string; messageId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    try {
      const result = await this.chatService.pinMessage(data.userId, data.messageId);
      this.server.to(result.chatId).emit('message_pinned', result);
    } catch (e: any) {
      client.emit('message_error', { message: e?.message || 'Failed to pin message' });
    }
  }

  @SubscribeMessage('unpin_message')
  async handleUnpinMessage(
    @MessageBody() data: { userId: string; messageId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    try {
      const result = await this.chatService.unpinMessage(data.userId, data.messageId);
      this.server.to(result.chatId).emit('message_unpinned', result);
    } catch (e: any) {
      client.emit('message_error', { message: e?.message || 'Failed to unpin message' });
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

    if (await this.blocks.isBlockedEitherDirection(data.callerId, data.targetUserId)) {
      client.emit('call_failed', { reason: 'You cannot call this user.' });
      return;
    }

    const [callee, caller] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: data.targetUserId },
        select: {
          username: true,
          expoPushToken: true,
          profile: { select: { displayName: true, avatarUrl: true } },
        },
      }),
      this.prisma.user.findUnique({
        where: { id: data.callerId },
        select: { profile: { select: { avatarUrl: true } } },
      }),
    ]);
    if (!callee) {
      client.emit('call_failed', { reason: 'That user could not be found.' });
      return;
    }
    const calleeName = callee.profile?.displayName || callee.username;
    const isCalleeOnline = Array.from(this.connectedUsers.values()).some(
      (u) => u.userId === data.targetUserId,
    );
    // A live socket is no longer a hard requirement — a push notification
    // (below) can still reach a backgrounded/killed app. Only fail outright
    // when there's neither a live socket NOR any way to reach the device.
    if (!isCalleeOnline && !callee.expoPushToken) {
      client.emit('call_failed', {
        reason: `${calleeName} is offline right now.`,
      });
      return;
    }

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

    const callRecord = await this.callService.recordRinging(
      data.callerId,
      data.targetUserId,
      data.video ? 'video' : 'voice',
      roomName,
    );
    const callId = callRecord.id;

    const timeout = setTimeout(() => {
      this.emitToUser(data.callerId, 'call_ended', {
        callId,
        reason: 'missed',
      });
      this.emitToUser(data.targetUserId, 'call_ended', {
        callId,
        reason: 'missed',
      });
      this.callService.markEnded(callId, 'missed').catch((e) => console.error('Failed to record missed call:', e));
      this.notifyMissedCall(callId, data.callerId, data.targetUserId, data.video);
      this.cleanupCall(callId);
    }, CALL_RING_TIMEOUT_MS);

    this.pendingCalls.set(callId, {
      callId,
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
      callerAvatarUrl: caller?.profile?.avatarUrl ?? null,
      video: data.video,
    });
    client.emit('call_ringing', {
      callId,
      roomName,
      wsUrl,
      token: callerToken,
      calleeAvatarUrl: callee.profile?.avatarUrl ?? null,
    });

    // Push notification alongside the live socket emit above — this is what
    // actually gets an incoming call to reach a backgrounded/killed device
    // today (see docs/plan: Phase 6 layers native CallKit/ConnectionService
    // ringing on top of this same Call record + push).
    if (callee.expoPushToken) {
      sendCategorizedPush(
        this.prisma,
        data.targetUserId,
        'calls',
        callee.expoPushToken,
        `Incoming ${data.video ? 'video' : 'voice'} call`,
        `${data.callerName} is calling you`,
        { type: 'incoming_call', callId, callerId: data.callerId, video: data.video },
      ).catch((e) => console.error('Failed to push incoming-call notification:', e));
    }
  }

  // Durable record for the callee even if they never saw the live ring —
  // mirrors how a chat message always gets an in-app Notification row
  // regardless of push-token/live-socket state (see notifyChatMembers).
  private async notifyMissedCall(callId: string, callerId: string, calleeId: string, video: boolean) {
    const callerName = await this.chatService.getDisplayName(callerId);
    await this.notifications.create(
      calleeId,
      'call.missed',
      'Missed call',
      `You missed a ${video ? 'video' : 'voice'} call from ${callerName}`,
      { callId, callerId },
    );
  }

  @SubscribeMessage('call_accept')
  handleCallAccept(@MessageBody() data: { callId: string }) {
    const call = this.pendingCalls.get(data.callId);
    if (!call) return;
    call.accepted = true;
    this.callService.markOngoing(data.callId).catch((e) => console.error('Failed to record call connect:', e));
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
    this.callService.markEnded(data.callId, 'declined').catch((e) => console.error('Failed to record declined call:', e));
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
    this.callService
      .markEnded(data.callId, call.accepted ? 'completed' : 'missed')
      .catch((e) => console.error('Failed to record call end:', e));
    this.cleanupCall(data.callId);
  }

  // Vemoji reactions during an active call — relayed peer-to-peer over the
  // same signaling socket, not persisted anywhere. Only valid once the call
  // has actually been accepted (pendingCalls keeps the entry, with
  // accepted:true, for the call's whole duration — see cleanupCall).
  // Also checks groupCalls so the same reaction tray works in a group call —
  // broadcast to every connected participant except whoever sent it.
  @SubscribeMessage('call_reaction')
  handleCallReaction(
    @MessageBody() data: { callId: string; type: VemojiType },
    @ConnectedSocket() client: Socket,
  ) {
    const requester = this.connectedUsers.get(client.id)?.userId;
    if (!requester) return;

    const call = this.pendingCalls.get(data.callId);
    if (call && call.accepted) {
      const otherId = requester === call.callerId ? call.calleeId : call.callerId;
      this.emitToUser(otherId, 'call_reaction', { callId: data.callId, type: data.type });
      return;
    }

    const groupCall = this.groupCalls.get(data.callId);
    if (groupCall && groupCall.connected.has(requester)) {
      for (const memberId of groupCall.connected) {
        if (memberId !== requester) this.emitToUser(memberId, 'call_reaction', { callId: data.callId, type: data.type });
      }
    }
  }

  // ── Group calling ────────────────────────────────────────────────────────
  // A GROUP chat's equivalent of the 1:1 flow above — same socket, same
  // Call persistence layer (extended with CallParticipant, see call.service),
  // but rings every other member of the chat instead of one target user, and
  // the call stays alive until the last connected participant leaves rather
  // than ending the moment any one person hangs up.

  @SubscribeMessage('group_call_invite')
  async handleGroupCallInvite(
    @MessageBody()
    data: { callerId: string; callerName: string; chatId: string; video: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const chat = await this.prisma.chat.findUnique({ where: { id: data.chatId } });
    if (!chat || chat.type !== 'GROUP') {
      client.emit('group_call_failed', { reason: 'Group calling is only available in group chats.' });
      return;
    }
    const membership = await this.prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId: data.chatId, userId: data.callerId } },
    });
    if (!membership) {
      client.emit('group_call_failed', { reason: 'You are not a member of this chat.' });
      return;
    }

    const members = await this.prisma.chatMember.findMany({
      where: { chatId: data.chatId, userId: { not: data.callerId } },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            expoPushToken: true,
            profile: { select: { displayName: true } },
          },
        },
      },
    });

    // Same block check as a 1:1 invite, applied per member — a blocked pair
    // is silently skipped rather than failing the whole call for everyone
    // else in the chat.
    const invitable: { id: string; name: string; pushToken: string | null }[] = [];
    for (const m of members) {
      if (await this.blocks.isBlockedEitherDirection(data.callerId, m.userId)) continue;
      invitable.push({
        id: m.userId,
        name: m.user.profile?.displayName || m.user.username,
        pushToken: m.user.expoPushToken,
      });
    }
    if (invitable.length === 0) {
      client.emit('group_call_failed', { reason: 'No one else can be reached in this chat right now.' });
      return;
    }

    let roomName: string, wsUrl: string, callerToken: string, tokenByUserId: Map<string, string>;
    try {
      ({ roomName, wsUrl, callerToken, tokenByUserId } = await this.callService.createGroupCall(
        data.callerId,
        data.callerName,
        invitable.map((m) => ({ id: m.id, name: m.name })),
      ));
    } catch (e) {
      console.error('group_call_invite: failed to create LiveKit room:', e);
      client.emit('group_call_failed', {
        reason: 'Could not start the call right now. Please try again shortly.',
      });
      return;
    }

    const callRecord = await this.callService.recordGroupRinging(
      data.callerId,
      data.chatId,
      data.video ? 'video' : 'voice',
      roomName,
      invitable.map((m) => m.id),
    );
    const callId = callRecord.id;

    const groupCall: PendingGroupCall = {
      callId,
      callerId: data.callerId,
      chatId: data.chatId,
      roomName,
      type: data.video ? 'video' : 'voice',
      ringTimeouts: new Map(),
      connected: new Set([data.callerId]),
      everyone: new Set([data.callerId, ...invitable.map((m) => m.id)]),
      anyGuestJoined: false,
    };
    this.groupCalls.set(callId, groupCall);

    for (const m of invitable) {
      groupCall.ringTimeouts.set(
        m.id,
        setTimeout(() => this.handleGroupParticipantGone(callId, m.id, 'missed'), CALL_RING_TIMEOUT_MS),
      );
      this.emitToUser(m.id, 'group_call_incoming', {
        callId,
        roomName,
        wsUrl,
        token: tokenByUserId.get(m.id),
        callerId: data.callerId,
        callerName: data.callerName,
        chatId: data.chatId,
        chatName: chat.name,
        video: data.video,
      });
      if (m.pushToken) {
        sendCategorizedPush(
          this.prisma,
          m.id,
          'calls',
          m.pushToken,
          `Incoming group ${data.video ? 'video' : 'voice'} call`,
          `${data.callerName} started a call in ${chat.name || 'a group chat'}`,
          { type: 'incoming_group_call', callId, chatId: data.chatId, video: data.video },
        ).catch((e) => console.error('Failed to push group-call notification:', e));
      }
    }

    client.emit('group_call_ringing', { callId, roomName, wsUrl, token: callerToken });
  }

  @SubscribeMessage('group_call_join')
  async handleGroupCallJoin(@MessageBody() data: { callId: string; userId: string }) {
    const call = this.groupCalls.get(data.callId);
    if (!call) return;
    const timeout = call.ringTimeouts.get(data.userId);
    if (timeout) {
      clearTimeout(timeout);
      call.ringTimeouts.delete(data.userId);
    }
    call.connected.add(data.userId);
    if (data.userId !== call.callerId) call.anyGuestJoined = true;
    this.callService
      .setParticipantStatus(data.callId, data.userId, 'joined')
      .catch((e) => console.error('Failed to record group call join:', e));
    this.callService
      .markGroupConnectedIfNeeded(data.callId)
      .catch((e) => console.error('Failed to mark group call connected:', e));

    const name = await this.chatService.getDisplayName(data.userId);
    for (const memberId of call.connected) {
      if (memberId !== data.userId) {
        this.emitToUser(memberId, 'group_call_participant_joined', { callId: data.callId, userId: data.userId, userName: name });
      }
    }
  }

  @SubscribeMessage('group_call_decline')
  handleGroupCallDecline(@MessageBody() data: { callId: string; userId: string }) {
    this.handleGroupParticipantGone(data.callId, data.userId, 'declined');
  }

  // Covers both an explicit hangup and the caller leaving early — either
  // way the call keeps going for whoever's still connected (see
  // handleGroupParticipantGone), unlike the 1:1 path where either side
  // hanging up always ends the whole call.
  @SubscribeMessage('group_call_leave')
  handleGroupCallLeave(@MessageBody() data: { callId: string; userId: string }) {
    this.handleGroupParticipantGone(data.callId, data.userId, 'left');
  }
}
