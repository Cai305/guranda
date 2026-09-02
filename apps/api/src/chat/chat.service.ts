import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UsersService } from '../users/users.service';
import { BlocksService } from '../blocks/blocks.service';
import { AchievementsService } from '../achievements/achievements.service';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private blocks: BlocksService,
    private achievements: AchievementsService,
  ) {}

  // ── Chat wallpaper ─────────────────────────────────────────────────────
  // Two layers: a global default (UserProfile.chatWallpaperUrl, applies to
  // every chat this user opens) and a per-chat override (ChatMember.
  // wallpaperUrl, this user + this chat only). The value itself is either
  // a full image URL (uploaded custom wallpaper) or a short preset id the
  // client resolves against its own PRESET_WALLPAPERS table — the server
  // treats it as an opaque string either way.

  async setGlobalWallpaper(userId: string, wallpaperUrl: string | null) {
    await this.prisma.userProfile.update({
      where: { userId },
      data: { chatWallpaperUrl: wallpaperUrl },
    });
    return { chatWallpaperUrl: wallpaperUrl };
  }

  async setChatWallpaper(
    chatId: string,
    userId: string,
    wallpaperUrl: string | null,
  ) {
    const membership = await this.prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });
    if (!membership) {
      throw new BadRequestException('You are not a member of this chat');
    }
    await this.prisma.chatMember.update({
      where: { chatId_userId: { chatId, userId } },
      data: { wallpaperUrl },
    });
    return { chatId, wallpaperUrl };
  }

  async getWallpaper(chatId: string, userId: string) {
    const [membership, profile] = await Promise.all([
      this.prisma.chatMember.findUnique({
        where: { chatId_userId: { chatId, userId } },
        select: { wallpaperUrl: true },
      }),
      this.prisma.userProfile.findUnique({
        where: { userId },
        select: { chatWallpaperUrl: true },
      }),
    ]);
    if (!membership) {
      throw new BadRequestException('You are not a member of this chat');
    }
    return {
      wallpaperUrl: membership.wallpaperUrl ?? profile?.chatWallpaperUrl ?? null,
      isPerChatOverride: !!membership.wallpaperUrl,
      globalWallpaperUrl: profile?.chatWallpaperUrl ?? null,
    };
  }

  async getPublicChannels() {
    const channels = await this.prisma.chat.findMany({
      where: { isPublic: true },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    return channels.map((c) => ({
      id: c.id,
      name: c.name,
      type: 'Public',
      channelType: c.channelType,
      status: 'online',
      lastMessageAt: c.messages[0]?.createdAt ?? c.createdAt,
    }));
  }

  async getUserChats(userId: string) {
    const memberships = await this.prisma.chatMember.findMany({
      where: { userId },
      include: {
        chat: {
          include: {
            members: {
              include: { user: { include: { profile: true } } },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    // Auto-status is only worth resolving for DIRECT chats (a group/channel
    // has no single "other person" to show a status for) — collect target
    // ids up front so it's one batched query instead of one per row.
    const directTargetIds = memberships
      .filter((m) => m.chat.type === 'DIRECT')
      .map((m) => m.chat.members.find((mem) => mem.userId !== userId)?.userId)
      .filter((id): id is string => !!id);
    const statusByUserId = await this.usersService.resolveActiveStatuses(
      directTargetIds,
    );

    // unreadCount needs a per-chat query since it's a count over messages,
    // not something the membership include above can express — the list
    // renders the actual number (not just a boolean dot) below the envelope.
    const ownChats = await Promise.all(
      memberships.map(async (m) => {
        const chat = m.chat;
        let name = chat.name;
        let targetUserId: string | null = null;
        let avatarUrl: string | null = null;
        let effectiveStatus: string | null = null;
        let lastSeenAt: Date | null = null;

        // If it's a DIRECT chat, use the other user's name/avatar/status
        if (chat.type === 'DIRECT') {
          const otherMember = chat.members.find(
            (member) => member.userId !== userId,
          );
          if (otherMember) {
            name =
              otherMember.user.profile?.displayName ||
              otherMember.user.username;
            targetUserId = otherMember.userId;
            avatarUrl = otherMember.user.profile?.avatarUrl ?? null;
            effectiveStatus = statusByUserId.get(otherMember.userId) ?? null;
            lastSeenAt = otherMember.user.lastSeenAt;
          }
        }

        const lastMessage = chat.messages[0];

        const unreadCount = await this.prisma.message.count({
          where: {
            chatId: chat.id,
            senderId: { not: userId },
            createdAt: { gt: m.lastReadAt },
          },
        });

        return {
          id: chat.id,
          name: name,
          type: chat.type,
          targetUserId,
          avatarUrl,
          effectiveStatus,
          lastSeenAt,
          lastMessageAt: lastMessage ? lastMessage.createdAt : chat.createdAt,
          hasNewMessage: unreadCount > 0,
          unreadCount,
        };
      }),
    );

    const ownChatIds = new Set(ownChats.map((c) => c.id));
    // Additive: chats a relationship partner has explicitly shared with this
    // user, rendered the same way the owner's own copy would be. Skips any
    // chat this user is already a real member of (can't happen today since
    // a share only targets a DIRECT chat this user isn't already in, but
    // guards against a future edge case cheaply).
    const delegatedChats = (await this.getDelegatedChats(userId)).filter(
      (c) => !ownChatIds.has(c.id),
    );

    return [...ownChats, ...delegatedChats].sort(
      (a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt),
    );
  }

  /** Other members of a chat, with just enough profile/token data to address a push notification. */
  async getMembersForNotification(chatId: string, excludeUserId: string) {
    return this.prisma.chatMember.findMany({
      where: { chatId, userId: { not: excludeUserId } },
      include: {
        user: { select: { expoPushToken: true } },
      },
    });
  }

  /** Delegates a chat is shared with, with enough data to push+in-app-notify them on their own device. */
  async getDelegatesForNotification(chatId: string, excludeUserId: string) {
    return this.prisma.chatShare.findMany({
      where: { chatId, delegateId: { not: excludeUserId } },
      include: { delegate: { select: { expoPushToken: true } } },
    });
  }

  async getDisplayName(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, profile: { select: { displayName: true } } },
    });
    return user?.profile?.displayName || user?.username || 'Someone';
  }

  // Community channels have no ChatMember rows — membership is tracked at the
  // community level (CommunityMember), not the chat level. This is the one
  // access check either send or read path enforces today; DIRECT/GROUP chats
  // and public (isPublic) channels are untouched — same open-by-default
  // behavior they've always had.
  private async assertCanAccessChannel(chatId: string, userId: string) {
    const chat = await this.prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat || !chat.communityId || chat.isPublic) return;
    const membership = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId: chat.communityId, userId } },
    });
    if (!membership) {
      throw new ForbiddenException('You must be a member of this community to access this channel');
    }
  }

  private async assertCanPostInChannel(chatId: string, userId: string) {
    const chat = await this.prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat || !chat.communityId || chat.isPublic) return;
    const membership = await this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId: chat.communityId, userId } },
    });
    if (!membership) {
      throw new ForbiddenException('You must be a member of this community to post here');
    }
    if (chat.channelType === 'ANNOUNCEMENT' && membership.role === 'MEMBER') {
      throw new ForbiddenException('Only admins and moderators can post in this announcement channel');
    }
  }

  // Relationship-partner shared chats (ChatShare) — a delegate reads/sends
  // in a DIRECT chat they were never a ChatMember of, appearing to the
  // chat's other participant as the owner they were shared by. Resolves
  // what identity `callerId` should act/read as for `chatId`:
  //  - a real ChatMember: unchanged behavior (display + actual sender is
  //    themselves, nothing masked)
  //  - a valid delegate (ChatShare row): displays as the share's owner,
  //    actualSenderId records who really sent it
  //  - neither: ForbiddenException — this is what actually enforces "must be
  //    a member (or a valid delegate) to read/post" for DIRECT/GROUP chats,
  //    which previously had no check at all. A deliberate, narrowly-scoped
  //    tightening, required to define who may act as whom before who may
  //    send at all.
  //  - `operation` gates a delegate's specific granular permission
  //    (ChatShare.canRead/canWrite) — a real ChatMember is never limited by
  //    these, only a delegate acting through a share is.
  private async resolveSender(
    chatId: string,
    callerId: string,
    operation: 'read' | 'write' = 'write',
  ): Promise<{ displaySenderId: string; actualSenderId: string | null }> {
    const membership = await this.prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId: callerId } },
    });
    if (membership) {
      return { displaySenderId: callerId, actualSenderId: null };
    }
    const share = await this.prisma.chatShare.findUnique({
      where: { chatId_delegateId: { chatId, delegateId: callerId } },
    });
    if (share) {
      const allowed = operation === 'read' ? share.canRead : share.canWrite;
      if (!allowed) {
        throw new ForbiddenException(
          operation === 'read'
            ? 'You no longer have permission to read this chat'
            : 'You do not have permission to send messages in this chat',
        );
      }
      return { displaySenderId: share.ownerId, actualSenderId: callerId };
    }
    throw new ForbiddenException('You do not have access to this chat');
  }

  async getMessages(chatId: string, callerId: string) {
    await this.assertCanAccessChannel(chatId, callerId);
    // DIRECT/GROUP chats have no community gate above — resolveSender is
    // what actually enforces membership-or-delegate access for them.
    const chat = await this.prisma.chat.findUnique({ where: { id: chatId } });
    if (chat && (chat.type === 'DIRECT' || chat.type === 'GROUP')) {
      await this.resolveSender(chatId, callerId, 'read');
    }
    // Update lastReadAt when user opens the chat — a real member's own
    // ChatMember row, or a delegate's own ChatShare row (their read
    // position is tracked separately from the owner's).
    await Promise.all([
      this.prisma.chatMember.updateMany({
        where: { chatId, userId: callerId },
        data: { lastReadAt: new Date() },
      }),
      this.prisma.chatShare.updateMany({
        where: { chatId, delegateId: callerId },
        data: { lastReadAt: new Date() },
      }),
    ]);

    const messages = await this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
      include: {
        replyTo: {
          select: {
            id: true,
            senderId: true,
            content: true,
            mediaUrl: true,
            sender: { select: { username: true, profile: { select: { displayName: true } } } },
          },
        },
      },
    });

    // actualSenderId must stay invisible to anyone but the owner/delegate
    // pair themselves — the third participant in a shared DIRECT chat (e.g.
    // Buse) is a real ChatMember and legitimately reads these messages, but
    // must never learn that a message shown as "Carol" was actually typed
    // by her delegate. Only strip when this chat actually has a share.
    const shares = await this.prisma.chatShare.findMany({ where: { chatId } });
    const isPrivileged = shares.some(
      (s) => s.ownerId === callerId || s.delegateId === callerId,
    );
    if (!isPrivileged) {
      for (const m of messages) (m as any).actualSenderId = null;
    }

    return messages.map((m) => this.toReplyPreviewShape(m));
  }

  // Flattens the nested `replyTo.sender.profile.displayName` Prisma include
  // into the denormalized ChatMessageReplyPreview shape the client expects —
  // shared by getMessages (REST history) and handleMessage (live socket echo)
  // so a reply quote renders identically whether it arrived via history or
  // realtime.
  private toReplyPreviewShape(m: any) {
    const { replyTo, ...rest } = m;
    return {
      ...rest,
      replyTo: replyTo
        ? {
            id: replyTo.id,
            senderId: replyTo.senderId,
            senderName: replyTo.sender.profile?.displayName || replyTo.sender.username,
            content: replyTo.content,
            mediaUrl: replyTo.mediaUrl || undefined,
          }
        : undefined,
    };
  }

  // Extracted from chat.gateway.ts's handleMessage — the socket path and the
  // AI tool (chat-ai-tools.provider.ts) now share this single implementation
  // instead of the gateway inlining its own Prisma write.
  //
  // `callerId` is who's actually sending (the authenticated actor — a real
  // member, or a relationship-partner delegate acting via ChatShare). For
  // DIRECT/GROUP chats this resolves through resolveSender: a real member
  // sends as themselves unchanged; a valid delegate's message is stored with
  // senderId = the share's owner (so it renders identically to every
  // existing chat UI) and actualSenderId = the delegate's real id.
  async sendMessage(
    callerId: string,
    chatId: string,
    content: string,
    mediaUrl?: string,
    replyToId?: string,
    isForwarded?: boolean,
  ) {
    await this.assertCanPostInChannel(chatId, callerId);
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: { members: true },
    });
    let senderId = callerId;
    let actualSenderId: string | null = null;
    if (chat && (chat.type === 'DIRECT' || chat.type === 'GROUP')) {
      const resolved = await this.resolveSender(chatId, callerId);
      senderId = resolved.displaySenderId;
      actualSenderId = resolved.actualSenderId;
    }
    // A block in either direction stops new messages in a DIRECT chat —
    // existing history stays readable, only sending is cut off. Checked
    // against the DISPLAY sender (the owner, if this is a delegate acting
    // on their behalf) since that's whose relationship with the other
    // participant is actually being messaged into.
    if (chat && chat.type === 'DIRECT') {
      const otherMember = chat.members.find((m) => m.userId !== senderId);
      if (otherMember && (await this.blocks.isBlockedEitherDirection(senderId, otherMember.userId))) {
        throw new ForbiddenException('You cannot message this user');
      }
    }
    const message = await this.prisma.message.create({
      data: { chatId, senderId, actualSenderId, content, mediaUrl, replyToId, isForwarded },
      include: {
        replyTo: {
          select: {
            id: true,
            senderId: true,
            content: true,
            mediaUrl: true,
            sender: { select: { username: true, profile: { select: { displayName: true } } } },
          },
        },
      },
    });
    // Counted against the DISPLAY sender (senderId), consistent with how
    // evaluatePlatformAchievementsForUser counts messagesSent by senderId —
    // a delegate's sent-as-owner messages correctly accrue to the owner.
    this.achievements.evaluatePlatformAchievementsForUser(senderId).catch(() => {});
    return this.toReplyPreviewShape(message);
  }

  // A caller may edit/delete a message when either (a) it's genuinely
  // theirs — message.senderId === callerId, true for a real member
  // (including the owner of a shared chat, always a real ChatMember of
  // their own chat), or (b) they're the delegate who actually sent it
  // (message.actualSenderId === callerId), gated by that delegate's
  // canUpdateMessages/canDeleteMessages permission — a delegate can never
  // touch the owner's own messages or the other participant's, only
  // messages they personally sent while acting as the owner.
  private async assertCanModifyMessage(
    message: { chatId: string; senderId: string; actualSenderId: string | null },
    callerId: string,
    permission: 'canUpdateMessages' | 'canDeleteMessages',
  ) {
    if (message.senderId === callerId) return;
    if (message.actualSenderId === callerId) {
      const share = await this.prisma.chatShare.findUnique({
        where: { chatId_delegateId: { chatId: message.chatId, delegateId: callerId } },
      });
      if (share?.[permission]) return;
      throw new ForbiddenException(
        permission === 'canUpdateMessages'
          ? 'You do not have permission to edit messages in this chat'
          : 'You do not have permission to delete messages in this chat',
      );
    }
    throw new ForbiddenException('You can only modify your own messages');
  }

  async editMessage(callerId: string, messageId: string, newContent: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.deletedAt) throw new BadRequestException('Message not found');
    await this.assertCanModifyMessage(message, callerId, 'canUpdateMessages');
    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { content: newContent, editedAt: new Date() },
      include: {
        replyTo: {
          select: {
            id: true,
            senderId: true,
            content: true,
            mediaUrl: true,
            sender: { select: { username: true, profile: { select: { displayName: true } } } },
          },
        },
      },
    });
    return this.toReplyPreviewShape(updated);
  }

  async deleteMessage(callerId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.deletedAt) throw new BadRequestException('Message not found');
    await this.assertCanModifyMessage(message, callerId, 'canDeleteMessages');
    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });
    return { id: updated.id, chatId: updated.chatId, deletedAt: updated.deletedAt };
  }

  // ── Relationship-partner shared chats (ChatShare) ──────────────────────
  // Explicit, per-chat opt-in: sharing is never automatic just from being in
  // an active Relationship. Only a DIRECT chat's own member can share it,
  // and only with their active relationship partner.

  async shareChat(
    ownerId: string,
    chatId: string,
    delegateId: string,
    permissions?: {
      canRead?: boolean;
      canWrite?: boolean;
      canUpdateMessages?: boolean;
      canDeleteMessages?: boolean;
    },
  ) {
    if (ownerId === delegateId) {
      throw new BadRequestException('You cannot share a chat with yourself');
    }
    const [chat, membership, relationship] = await Promise.all([
      this.prisma.chat.findUnique({ where: { id: chatId } }),
      this.prisma.chatMember.findUnique({
        where: { chatId_userId: { chatId, userId: ownerId } },
      }),
      this.prisma.relationship.findFirst({
        where: {
          status: 'active',
          OR: [
            { userAId: ownerId, userBId: delegateId },
            { userAId: delegateId, userBId: ownerId },
          ],
        },
      }),
    ]);
    if (!chat || chat.type !== 'DIRECT') {
      throw new BadRequestException('Only a direct chat can be shared');
    }
    if (!membership) {
      throw new ForbiddenException('You are not a member of this chat');
    }
    if (!relationship) {
      throw new ForbiddenException(
        'You can only share a chat with your relationship partner',
      );
    }
    // Defaults match the schema: read+write on, update/delete off — a
    // re-share (already-existing row) updates the permission set too, so
    // toggling a switch in the share modal is just calling this again.
    const data = {
      canRead: permissions?.canRead ?? true,
      canWrite: permissions?.canWrite ?? true,
      canUpdateMessages: permissions?.canUpdateMessages ?? false,
      canDeleteMessages: permissions?.canDeleteMessages ?? false,
    };
    const share = await this.prisma.chatShare.upsert({
      where: { chatId_delegateId: { chatId, delegateId } },
      create: { chatId, ownerId, delegateId, ...data },
      update: data,
    });
    return share;
  }

  async unshareChat(ownerId: string, chatId: string, delegateId: string) {
    const share = await this.prisma.chatShare.findUnique({
      where: { chatId_delegateId: { chatId, delegateId } },
    });
    if (!share || share.ownerId !== ownerId) {
      throw new ForbiddenException('No matching share to remove');
    }
    await this.prisma.chatShare.delete({ where: { id: share.id } });
    return { ok: true };
  }

  // Who this chat is currently shared with — owner-only view, used to render
  // the "shared with X" state in the chat's own settings.
  async getChatShares(chatId: string, ownerId: string) {
    const membership = await this.prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId: ownerId } },
    });
    if (!membership) {
      throw new ForbiddenException('You are not a member of this chat');
    }
    const shares = await this.prisma.chatShare.findMany({
      where: { chatId, ownerId },
      include: {
        delegate: { select: { username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
      },
    });
    return shares.map((s) => ({
      delegateId: s.delegateId,
      delegateName: s.delegate.profile?.displayName || s.delegate.username,
      delegateAvatarUrl: s.delegate.profile?.avatarUrl ?? null,
      createdAt: s.createdAt,
      canRead: s.canRead,
      canWrite: s.canWrite,
      canUpdateMessages: s.canUpdateMessages,
      canDeleteMessages: s.canDeleteMessages,
    }));
  }

  // Chats shared TO this user by a partner (as delegate) — merged
  // additively into getUserChats below.
  private async getDelegatedChats(delegateId: string) {
    const shares = await this.prisma.chatShare.findMany({
      where: { delegateId },
      include: {
        chat: {
          include: {
            members: { include: { user: { include: { profile: true } } } },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
    });
    return Promise.all(
      shares
        .filter((s) => s.chat.type === 'DIRECT')
        .map(async (s) => {
          const otherMember = s.chat.members.find((m) => m.userId !== s.ownerId);
          const lastMessage = s.chat.messages[0];
          const unreadCount = await this.prisma.message.count({
            where: {
              chatId: s.chat.id,
              senderId: { not: s.ownerId },
              createdAt: { gt: s.lastReadAt },
            },
          });
          return {
            id: s.chat.id,
            // Rendered exactly like the owner's own copy of this chat would
            // be — the delegate is acting as the owner, so the chat-list
            // entry shows the same "other person" the owner would see.
            name:
              otherMember?.user.profile?.displayName || otherMember?.user.username || s.chat.name,
            type: s.chat.type,
            targetUserId: otherMember?.userId ?? null,
            avatarUrl: otherMember?.user.profile?.avatarUrl ?? null,
            effectiveStatus: null,
            lastSeenAt: otherMember?.user.lastSeenAt ?? null,
            lastMessageAt: lastMessage ? lastMessage.createdAt : s.chat.createdAt,
            hasNewMessage: unreadCount > 0,
            unreadCount,
            sharedByUserId: s.ownerId,
          };
        }),
    );
  }

  // Copies a message's content/media into one or more other chats the
  // caller belongs to. Forwarded messages stand alone — they don't carry
  // the original's replyTo, only an isForwarded flag — matching how
  // WhatsApp/Telegram-style forwarding behaves.
  async forwardMessage(userId: string, messageId: string, targetChatIds: string[]) {
    const source = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!source) throw new BadRequestException('Message not found');

    const [sourceMembership, targetMemberships] = await Promise.all([
      this.prisma.chatMember.findFirst({ where: { chatId: source.chatId, userId } }),
      this.prisma.chatMember.findMany({ where: { chatId: { in: targetChatIds }, userId } }),
    ]);
    if (!sourceMembership) throw new BadRequestException('You are not a member of that chat');
    const validTargetIds = new Set(targetMemberships.map((m) => m.chatId));
    const forwardableChatIds = targetChatIds.filter((id) => validTargetIds.has(id));
    if (forwardableChatIds.length === 0) {
      throw new BadRequestException('No valid target chats selected');
    }

    return Promise.all(
      forwardableChatIds.map((chatId) =>
        this.prisma.message.create({
          data: {
            chatId,
            senderId: userId,
            content: source.content,
            mediaUrl: source.mediaUrl,
            isForwarded: true,
          },
        }),
      ),
    );
  }

  // A real family/co-workers/friends group — distinct from createDirectChat's
  // exactly-2-members case. The creator becomes ADMIN so they can manage the
  // group later (rename, remove members); everyone else invited at creation
  // starts as a plain MEMBER.
  async createGroupChat(
    creatorId: string,
    name: string,
    memberUserIds: string[],
  ) {
    const trimmedName = name?.trim();
    if (!trimmedName) throw new BadRequestException('Group name is required');

    const uniqueMemberIds = Array.from(
      new Set(memberUserIds.filter((id) => id && id !== creatorId)),
    );
    if (uniqueMemberIds.length === 0)
      throw new BadRequestException('Add at least one other member');

    const validUsers = await this.prisma.user.findMany({
      where: { id: { in: uniqueMemberIds } },
      select: { id: true },
    });
    if (validUsers.length !== uniqueMemberIds.length) {
      throw new BadRequestException(
        'One or more selected members do not exist',
      );
    }

    return this.prisma.chat.create({
      data: {
        type: 'GROUP',
        name: trimmedName,
        members: {
          create: [
            { userId: creatorId, role: 'ADMIN' },
            ...uniqueMemberIds.map((userId) => ({
              userId,
              role: 'MEMBER' as const,
            })),
          ],
        },
      },
      include: {
        members: { include: { user: { include: { profile: true } } } },
      },
    });
  }

  async createDirectChat(userId: string, targetUserId: string) {
    if (await this.blocks.isBlockedEitherDirection(userId, targetUserId)) {
      throw new ForbiddenException('You cannot start a chat with this user');
    }
    // Check if chat already exists
    const existingChats = await this.prisma.chat.findMany({
      where: {
        type: 'DIRECT',
        members: {
          every: {
            userId: { in: [userId, targetUserId] },
          },
        },
      },
      include: { members: true },
    });

    const exactMatch = existingChats.find((chat) => chat.members.length === 2);
    if (exactMatch) {
      return exactMatch;
    }

    // Create new direct chat
    return this.prisma.chat.create({
      data: {
        type: 'DIRECT',
        members: {
          create: [
            { userId, role: 'MEMBER' },
            { userId: targetUserId, role: 'MEMBER' },
          ],
        },
      },
    });
  }
}
