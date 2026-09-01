import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const ROLE_RANK: Record<string, number> = { MEMBER: 0, MOD: 1, ADMIN: 2 };
const CHANNEL_TYPES = ['TEXT', 'ANNOUNCEMENT', 'VOICE'];

@Injectable()
export class CommunitiesService {
  private readonly apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
  private readonly apiSecret = process.env.LIVEKIT_API_SECRET || 'secret';
  private readonly wsUrl = process.env.LIVEKIT_WS_URL || 'ws://localhost:7880';
  private readonly roomService: RoomServiceClient;

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {
    const httpUrl = process.env.LIVEKIT_HTTP_URL || 'http://localhost:7880';
    this.roomService = new RoomServiceClient(httpUrl, this.apiKey, this.apiSecret);
  }

  // ── Role helpers ──────────────────────────────────────────────────────
  private async getMembership(communityId: string, userId: string) {
    return this.prisma.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
    });
  }

  private async assertRole(communityId: string, userId: string, minRole: 'MOD' | 'ADMIN') {
    const membership = await this.getMembership(communityId, userId);
    if (!membership || ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
      throw new ForbiddenException(`You must be a community ${minRole.toLowerCase()} to do this`);
    }
    return membership;
  }

  // ── Community CRUD ────────────────────────────────────────────────────
  async findAll() {
    return this.prisma.community.findMany({
      include: { _count: { select: { members: true } } },
    });
  }

  async browseCommunities(userId: string, query?: string, category?: string) {
    const myMemberships = await this.prisma.communityMember.findMany({
      where: { userId },
      select: { communityId: true },
    });
    const myCommunityIds = myMemberships.map((m) => m.communityId);

    return this.prisma.community.findMany({
      where: {
        OR: [{ privacy: 'PUBLIC' }, { id: { in: myCommunityIds } }],
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(category ? { category } : {}),
      },
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findUserCommunities(userId: string) {
    const memberships = await this.prisma.communityMember.findMany({
      where: { userId },
      include: {
        community: {
          include: { _count: { select: { members: true } } },
        },
      },
    });
    return memberships.map((m) => ({ ...m.community, myRole: m.role }));
  }

  async getCommunityDetails(id: string, userId: string) {
    const [community, membership] = await Promise.all([
      this.prisma.community.findUnique({
        where: { id },
        include: {
          rooms: true,
          _count: { select: { members: true } },
        },
      }),
      this.getMembership(id, userId),
    ]);
    if (!community) return community;
    if (community.privacy === 'PRIVATE' && !membership) {
      throw new ForbiddenException('This community is private');
    }
    const pinnedApps = await this.prisma.communityPinnedApp.findMany({
      where: { communityId: id },
      orderBy: { addedAt: 'asc' },
    });
    return {
      ...community,
      isMember: !!membership,
      myRole: membership?.role,
      pinnedAppIds: pinnedApps.map((p) => p.appId),
    };
  }

  async joinCommunity(userId: string, communityId: string) {
    const community = await this.prisma.community.findUnique({ where: { id: communityId } });
    if (!community) throw new NotFoundException('Community not found');
    if (community.privacy === 'PRIVATE') {
      throw new ForbiddenException('This community is invite-only — ask a member for an invite link');
    }
    try {
      await this.prisma.communityMember.create({
        data: { userId, communityId },
      });
      return { status: 'joined' };
    } catch {
      // Already joined
      return { status: 'already_joined' };
    }
  }

  async createCommunity(
    userId: string,
    name: string,
    description?: string,
    iconUrl?: string,
    coverUrl?: string,
    category?: string,
    privacy?: 'PUBLIC' | 'PRIVATE',
  ) {
    if (!name?.trim()) throw new BadRequestException('Community name is required');
    const community = await this.prisma.community.create({
      data: {
        name: name.trim(),
        description,
        iconUrl,
        coverUrl,
        category,
        privacy: privacy === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC',
        members: {
          create: [{ userId, role: 'ADMIN' }],
        },
        rooms: {
          create: [{ name: 'General', type: 'CHANNEL', channelType: 'TEXT' }],
        },
      },
    });
    return community;
  }

  async updateCommunity(
    communityId: string,
    userId: string,
    data: {
      name?: string;
      description?: string;
      iconUrl?: string;
      coverUrl?: string;
      category?: string;
      privacy?: 'PUBLIC' | 'PRIVATE';
    },
  ) {
    await this.assertRole(communityId, userId, 'ADMIN');
    if (data.name !== undefined && !data.name.trim()) {
      throw new BadRequestException('Community name cannot be empty');
    }
    return this.prisma.community.update({
      where: { id: communityId },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.iconUrl !== undefined ? { iconUrl: data.iconUrl } : {}),
        ...(data.coverUrl !== undefined ? { coverUrl: data.coverUrl } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.privacy !== undefined ? { privacy: data.privacy } : {}),
      },
    });
  }

  async deleteCommunity(communityId: string, userId: string) {
    await this.assertRole(communityId, userId, 'ADMIN');
    const rooms = await this.prisma.chat.findMany({
      where: { communityId },
      select: { id: true },
    });
    const roomIds = rooms.map((r) => r.id);
    await this.prisma.$transaction([
      this.prisma.message.deleteMany({ where: { chatId: { in: roomIds } } }),
      this.prisma.chatMember.deleteMany({ where: { chatId: { in: roomIds } } }),
      this.prisma.chat.deleteMany({ where: { communityId } }),
      this.prisma.communityPostLike.deleteMany({ where: { post: { communityId } } }),
      this.prisma.communityPostComment.deleteMany({ where: { post: { communityId } } }),
      this.prisma.communityPost.deleteMany({ where: { communityId } }),
      this.prisma.communityInvite.deleteMany({ where: { communityId } }),
      this.prisma.communityMember.deleteMany({ where: { communityId } }),
      this.prisma.community.delete({ where: { id: communityId } }),
    ]);
    return { deleted: true };
  }

  async leaveCommunity(communityId: string, userId: string) {
    const membership = await this.getMembership(communityId, userId);
    if (!membership) throw new BadRequestException('You are not a member of this community');
    if (membership.role === 'ADMIN') {
      const adminCount = await this.prisma.communityMember.count({
        where: { communityId, role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        throw new BadRequestException(
          'You are the last admin — promote someone else first, or delete the community',
        );
      }
    }
    await this.prisma.communityMember.delete({
      where: { communityId_userId: { communityId, userId } },
    });
    return { left: true };
  }

  // ── Members & roles ───────────────────────────────────────────────────
  async listMembers(communityId: string, userId: string) {
    const membership = await this.getMembership(communityId, userId);
    if (!membership) throw new ForbiddenException('You must be a member to view this');
    return this.prisma.communityMember.findMany({
      where: { communityId },
      include: {
        user: { select: { username: true, profile: { select: { displayName: true, avatarUrl: true } } } },
      },
      orderBy: [{ role: 'desc' }, { joinedAt: 'asc' }],
    });
  }

  async setMemberRole(
    communityId: string,
    actorId: string,
    targetUserId: string,
    role: 'ADMIN' | 'MOD' | 'MEMBER',
  ) {
    if (!['ADMIN', 'MOD', 'MEMBER'].includes(role)) {
      throw new BadRequestException('Invalid role');
    }
    await this.assertRole(communityId, actorId, 'ADMIN');
    const target = await this.getMembership(communityId, targetUserId);
    if (!target) throw new NotFoundException('That user is not a member of this community');

    if (target.role === 'ADMIN' && role !== 'ADMIN') {
      const adminCount = await this.prisma.communityMember.count({
        where: { communityId, role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        throw new BadRequestException('You cannot demote the last remaining admin');
      }
    }

    const updated = await this.prisma.communityMember.update({
      where: { communityId_userId: { communityId, userId: targetUserId } },
      data: { role },
    });
    const community = await this.prisma.community.findUnique({ where: { id: communityId } });
    await this.notifications.create(
      targetUserId,
      'community.role_changed',
      'Your role changed',
      `You are now ${role === 'ADMIN' ? 'an admin' : role === 'MOD' ? 'a moderator' : 'a member'} of ${community?.name}`,
      { communityId },
    );
    return updated;
  }

  async removeMember(communityId: string, actorId: string, targetUserId: string) {
    if (actorId === targetUserId) {
      return this.leaveCommunity(communityId, actorId);
    }
    const actor = await this.assertRole(communityId, actorId, 'MOD');
    const target = await this.getMembership(communityId, targetUserId);
    if (!target) throw new NotFoundException('That user is not a member of this community');
    if (ROLE_RANK[target.role] >= ROLE_RANK[actor.role]) {
      throw new ForbiddenException('You cannot remove a member with an equal or higher role');
    }
    await this.prisma.communityMember.delete({
      where: { communityId_userId: { communityId, userId: targetUserId } },
    });
    const community = await this.prisma.community.findUnique({ where: { id: communityId } });
    await this.notifications.create(
      targetUserId,
      'community.removed',
      'Removed from community',
      `You were removed from ${community?.name}`,
      { communityId },
    );
    return { removed: true };
  }

  // ── Channels ──────────────────────────────────────────────────────────
  async createChannel(
    communityId: string,
    userId: string,
    name: string,
    channelType: string,
  ) {
    await this.assertRole(communityId, userId, 'MOD');
    if (!name?.trim()) throw new BadRequestException('Channel name is required');
    if (!CHANNEL_TYPES.includes(channelType)) {
      throw new BadRequestException('channelType must be TEXT, ANNOUNCEMENT, or VOICE');
    }

    let voiceRoomName: string | undefined;
    if (channelType === 'VOICE') {
      voiceRoomName = `community-voice-${communityId}-${randomBytes(6).toString('hex')}`;
      await this.roomService.createRoom({ name: voiceRoomName, emptyTimeout: 300 });
    }

    const channel = await this.prisma.chat.create({
      data: {
        type: 'CHANNEL',
        name: name.trim(),
        communityId,
        channelType,
        voiceRoomName,
      },
    });

    const members = await this.prisma.communityMember.findMany({
      where: { communityId },
      select: { userId: true },
    });
    const community = await this.prisma.community.findUnique({ where: { id: communityId } });
    await Promise.all(
      members
        .filter((m) => m.userId !== userId)
        .map((m) =>
          this.notifications.create(
            m.userId,
            'community.channel_created',
            'New channel',
            `#${channel.name} was added to ${community?.name}`,
            { communityId, channelId: channel.id },
          ),
        ),
    );

    return channel;
  }

  async renameChannel(communityId: string, userId: string, channelId: string, name: string) {
    await this.assertRole(communityId, userId, 'MOD');
    if (!name?.trim()) throw new BadRequestException('Channel name is required');
    const channel = await this.prisma.chat.findUnique({ where: { id: channelId } });
    if (!channel || channel.communityId !== communityId) {
      throw new NotFoundException('Channel not found in this community');
    }
    return this.prisma.chat.update({ where: { id: channelId }, data: { name: name.trim() } });
  }

  async deleteChannel(communityId: string, userId: string, channelId: string) {
    await this.assertRole(communityId, userId, 'MOD');
    const channel = await this.prisma.chat.findUnique({ where: { id: channelId } });
    if (!channel || channel.communityId !== communityId) {
      throw new NotFoundException('Channel not found in this community');
    }
    const channelCount = await this.prisma.chat.count({ where: { communityId } });
    if (channelCount <= 1) {
      throw new BadRequestException('A community must have at least one channel');
    }
    if (channel.voiceRoomName) {
      try {
        await this.roomService.deleteRoom(channel.voiceRoomName);
      } catch {
        // Already empty/gone on the LiveKit side; not fatal.
      }
    }
    await this.prisma.$transaction([
      this.prisma.message.deleteMany({ where: { chatId: channelId } }),
      this.prisma.chatMember.deleteMany({ where: { chatId: channelId } }),
      this.prisma.chat.delete({ where: { id: channelId } }),
    ]);
    return { deleted: true };
  }

  async joinVoiceChannel(communityId: string, userId: string, userName: string, channelId: string) {
    await this.getMembershipOrThrow(communityId, userId);
    const channel = await this.prisma.chat.findUnique({ where: { id: channelId } });
    if (!channel || channel.communityId !== communityId || channel.channelType !== 'VOICE') {
      throw new NotFoundException('Voice channel not found in this community');
    }
    if (!channel.voiceRoomName) throw new BadRequestException('This voice channel has no room');

    const token = new AccessToken(this.apiKey, this.apiSecret, { identity: userId, name: userName });
    token.addGrant({
      room: channel.voiceRoomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });
    return { roomName: channel.voiceRoomName, token: await token.toJwt(), wsUrl: this.wsUrl };
  }

  private async getMembershipOrThrow(communityId: string, userId: string) {
    const membership = await this.getMembership(communityId, userId);
    if (!membership) throw new ForbiddenException('You must be a member of this community');
    return membership;
  }

  // ── Feed ──────────────────────────────────────────────────────────────
  async listPosts(communityId: string, userId: string) {
    const community = await this.prisma.community.findUnique({ where: { id: communityId } });
    if (!community) throw new NotFoundException('Community not found');
    if (community.privacy === 'PRIVATE') {
      await this.getMembershipOrThrow(communityId, userId);
    }
    const posts = await this.prisma.communityPost.findMany({
      where: { communityId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        _count: { select: { likes: true, comments: true } },
        likes: { where: { userId }, select: { id: true } },
      },
    });
    const authorIds = [...new Set(posts.map((p) => p.authorId))];
    const authors = await this.prisma.user.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } },
    });
    const authorById = new Map(authors.map((a) => [a.id, a]));
    return posts.map((p) => ({
      id: p.id,
      communityId: p.communityId,
      authorId: p.authorId,
      content: p.content,
      mediaUrl: p.mediaUrl,
      createdAt: p.createdAt,
      editedAt: p.editedAt,
      author: authorById.get(p.authorId),
      likeCount: p._count.likes,
      commentCount: p._count.comments,
      likedByMe: p.likes.length > 0,
    }));
  }

  async createPost(communityId: string, userId: string, content: string, mediaUrl?: string) {
    await this.getMembershipOrThrow(communityId, userId);
    if (!content?.trim() && !mediaUrl) {
      throw new BadRequestException('A post needs text or media');
    }
    return this.prisma.communityPost.create({
      data: { communityId, authorId: userId, content: content?.trim() || '', mediaUrl },
    });
  }

  async deletePost(communityId: string, userId: string, postId: string) {
    const post = await this.prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post || post.communityId !== communityId) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) {
      await this.assertRole(communityId, userId, 'MOD');
    }
    await this.prisma.$transaction([
      this.prisma.communityPostLike.deleteMany({ where: { postId } }),
      this.prisma.communityPostComment.deleteMany({ where: { postId } }),
      this.prisma.communityPost.delete({ where: { id: postId } }),
    ]);
    return { deleted: true };
  }

  async toggleLike(communityId: string, userId: string, postId: string) {
    await this.getMembershipOrThrow(communityId, userId);
    const post = await this.prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post || post.communityId !== communityId) throw new NotFoundException('Post not found');
    const existing = await this.prisma.communityPostLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (existing) {
      await this.prisma.communityPostLike.delete({ where: { id: existing.id } });
      return { liked: false };
    }
    await this.prisma.communityPostLike.create({ data: { postId, userId } });
    return { liked: true };
  }

  async listComments(communityId: string, postId: string) {
    const post = await this.prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post || post.communityId !== communityId) throw new NotFoundException('Post not found');
    const comments = await this.prisma.communityPostComment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
    });
    const authorIds = [...new Set(comments.map((c) => c.authorId))];
    const authors = await this.prisma.user.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, username: true, profile: { select: { displayName: true, avatarUrl: true } } },
    });
    const authorById = new Map(authors.map((a) => [a.id, a]));
    return comments.map((c) => ({ ...c, author: authorById.get(c.authorId) }));
  }

  async addComment(communityId: string, userId: string, postId: string, content: string) {
    await this.getMembershipOrThrow(communityId, userId);
    if (!content?.trim()) throw new BadRequestException('Comment cannot be empty');
    const post = await this.prisma.communityPost.findUnique({ where: { id: postId } });
    if (!post || post.communityId !== communityId) throw new NotFoundException('Post not found');
    return this.prisma.communityPostComment.create({
      data: { postId, authorId: userId, content: content.trim() },
    });
  }

  // ── Invites ───────────────────────────────────────────────────────────
  async createInvite(
    communityId: string,
    userId: string,
    opts?: { expiresAt?: string; maxUses?: number },
  ) {
    await this.assertRole(communityId, userId, 'MOD');
    const code = randomBytes(5).toString('hex');
    const invite = await this.prisma.communityInvite.create({
      data: {
        communityId,
        code,
        createdById: userId,
        expiresAt: opts?.expiresAt ? new Date(opts.expiresAt) : null,
        maxUses: opts?.maxUses ?? null,
      },
    });
    return { code: invite.code, link: `lifeos://community/join?code=${invite.code}`, expiresAt: invite.expiresAt, maxUses: invite.maxUses, useCount: invite.useCount };
  }

  async listInvites(communityId: string, userId: string) {
    await this.assertRole(communityId, userId, 'MOD');
    const invites = await this.prisma.communityInvite.findMany({
      where: { communityId },
      orderBy: { createdAt: 'desc' },
    });
    return invites.map((i) => ({
      code: i.code,
      link: `lifeos://community/join?code=${i.code}`,
      expiresAt: i.expiresAt,
      maxUses: i.maxUses,
      useCount: i.useCount,
    }));
  }

  async revokeInvite(communityId: string, userId: string, code: string) {
    await this.assertRole(communityId, userId, 'MOD');
    await this.prisma.communityInvite.deleteMany({ where: { communityId, code } });
    return { revoked: true };
  }

  async redeemInvite(userId: string, code: string) {
    const invite = await this.prisma.communityInvite.findUnique({ where: { code } });
    if (!invite) throw new NotFoundException('Invite link is invalid or has been revoked');
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new BadRequestException('This invite link has expired');
    }
    if (invite.maxUses !== null && invite.useCount >= invite.maxUses) {
      throw new BadRequestException('This invite link has reached its use limit');
    }
    await this.prisma.$transaction([
      this.prisma.communityMember.upsert({
        where: { communityId_userId: { communityId: invite.communityId, userId } },
        create: { communityId: invite.communityId, userId },
        update: {},
      }),
      this.prisma.communityInvite.update({
        where: { code },
        data: { useCount: { increment: 1 } },
      }),
    ]);
    const community = await this.prisma.community.findUnique({ where: { id: invite.communityId } });
    return { joined: true, communityId: invite.communityId, communityName: community?.name };
  }

  // ── Pinned apps & games ──────────────────────────────────────────────
  // appId is one of the static ids from apps/mobile/src/config/modules.ts
  // (MODULES) or hub/GamesScreen.tsx (GAMES) — not validated server-side
  // since that catalog is client-only config, same as StoreApp's isNative
  // rows don't validate against it either.
  async pinApp(communityId: string, userId: string, appId: string) {
    await this.assertRole(communityId, userId, 'MOD');
    if (!appId?.trim()) throw new BadRequestException('appId is required');
    try {
      await this.prisma.communityPinnedApp.create({ data: { communityId, appId } });
    } catch {
      // Already pinned — treat as a no-op success.
    }
    return { pinned: true };
  }

  async unpinApp(communityId: string, userId: string, appId: string) {
    await this.assertRole(communityId, userId, 'MOD');
    await this.prisma.communityPinnedApp.deleteMany({ where: { communityId, appId } });
    return { unpinned: true };
  }

  async inviteUser(communityId: string, userId: string, targetUserId: string) {
    await this.getMembershipOrThrow(communityId, userId);
    const [community, inviter, alreadyMember] = await Promise.all([
      this.prisma.community.findUnique({ where: { id: communityId } }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, profile: { select: { displayName: true } } },
      }),
      this.getMembership(communityId, targetUserId),
    ]);
    if (alreadyMember) throw new BadRequestException('That person is already a member');
    const inviterName = inviter?.profile?.displayName || inviter?.username || 'Someone';
    await this.notifications.create(
      targetUserId,
      'community.invite',
      `Invited to ${community?.name}`,
      `${inviterName} invited you to join ${community?.name}`,
      { communityId },
    );
    return { invited: true };
  }
}
