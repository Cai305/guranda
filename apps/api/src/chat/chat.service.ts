import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
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
    return Promise.all(
      memberships.map(async (m) => {
        const chat = m.chat;
        let name = chat.name;
        let targetUserId: string | null = null;
        let avatarUrl: string | null = null;
        let effectiveStatus: string | null = null;

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
          lastMessageAt: lastMessage ? lastMessage.createdAt : chat.createdAt,
          hasNewMessage: unreadCount > 0,
          unreadCount,
        };
      }),
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

  async getDisplayName(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, profile: { select: { displayName: true } } },
    });
    return user?.profile?.displayName || user?.username || 'Someone';
  }

  async getMessages(chatId: string, userId: string) {
    // Update lastReadAt when user opens the chat
    await this.prisma.chatMember.updateMany({
      where: { chatId, userId },
      data: { lastReadAt: new Date() },
    });

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
  async sendMessage(
    senderId: string,
    chatId: string,
    content: string,
    mediaUrl?: string,
    replyToId?: string,
    isForwarded?: boolean,
  ) {
    const message = await this.prisma.message.create({
      data: { chatId, senderId, content, mediaUrl, replyToId, isForwarded },
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
    return this.toReplyPreviewShape(message);
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
