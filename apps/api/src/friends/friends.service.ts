import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { sendPushNotification } from '../common/push';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BlocksService } from '../blocks/blocks.service';

@Injectable()
export class FriendsService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private notifications: NotificationsService,
    private blocks: BlocksService,
  ) {}

  async sendRequest(requesterId: string, addresseeId: string) {
    if (requesterId === addresseeId) {
      throw new BadRequestException('You cannot friend yourself');
    }
    if (await this.blocks.isBlockedEitherDirection(requesterId, addresseeId)) {
      throw new ForbiddenException('You cannot friend this user');
    }
    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
      },
    });
    if (existing) {
      if (existing.status === 'accepted') return existing;
      if (existing.status === 'pending' && existing.requesterId === addresseeId) {
        // They'd already asked us — treat this as accepting their request.
        return this.acceptRequest(existing.id, requesterId);
      }
      if (existing.status === 'pending') return existing; // already sent, no-op
      // declined/blocked: allow a fresh request by updating the row.
      return this.prisma.friendship.update({
        where: { id: existing.id },
        data: { requesterId, addresseeId, status: 'pending' },
      });
    }

    const friendship = await this.prisma.friendship.create({ data: { requesterId, addresseeId, status: 'pending' } });
    const addressee = await this.prisma.user.findUnique({ where: { id: addresseeId } });
    if (addressee?.expoPushToken) {
      await sendPushNotification(addressee.expoPushToken, 'New friend request', 'Someone wants to add you as a friend on Guranda');
    }
    await this.notifications.create(
      addresseeId,
      'friend.request',
      'New friend request',
      'Someone wants to add you as a friend on Guranda',
      { friendshipId: friendship.id, requesterId },
    );
    return friendship;
  }

  async acceptRequest(friendshipId: string, userId: string) {
    const friendship = await this.prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!friendship || friendship.addresseeId !== userId) {
      throw new NotFoundException('Friend request not found');
    }
    const updated = await this.prisma.friendship.update({ where: { id: friendshipId }, data: { status: 'accepted' } });
    await this.notifications.create(
      friendship.requesterId,
      'friend.request_accepted',
      'Friend request accepted',
      'Your friend request was accepted',
      { friendshipId: friendship.id, accepterId: userId },
    );
    return updated;
  }

  async declineRequest(friendshipId: string, userId: string) {
    const friendship = await this.prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!friendship || friendship.addresseeId !== userId) {
      throw new NotFoundException('Friend request not found');
    }
    return this.prisma.friendship.update({ where: { id: friendshipId }, data: { status: 'declined' } });
  }

  async removeFriend(friendshipId: string, userId: string) {
    const friendship = await this.prisma.friendship.findUnique({ where: { id: friendshipId } });
    if (!friendship || (friendship.requesterId !== userId && friendship.addresseeId !== userId)) {
      throw new NotFoundException('Friendship not found');
    }
    return this.prisma.friendship.delete({ where: { id: friendshipId } });
  }

  async listFriends(userId: string) {
    const rows = await this.prisma.friendship.findMany({
      where: { status: 'accepted', OR: [{ requesterId: userId }, { addresseeId: userId }] },
      include: {
        requester: { select: { id: true, username: true, profile: true } },
        addressee: { select: { id: true, username: true, profile: true } },
      },
    });
    const friends = rows.map((r) => ({
      friendshipId: r.id,
      user: r.requesterId === userId ? r.addressee : r.requester,
    }));
    const statusByUserId = await this.usersService.resolveActiveStatuses(
      friends.map((f) => f.user.id),
    );
    return friends.map((f) => ({
      ...f,
      effectiveStatus: statusByUserId.get(f.user.id) ?? null,
    }));
  }

  async listPending(userId: string) {
    return this.prisma.friendship.findMany({
      where: { status: 'pending', addresseeId: userId },
      include: { requester: { select: { id: true, username: true, profile: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async areFriends(userIdA: string, userIdB: string): Promise<boolean> {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        status: 'accepted',
        OR: [
          { requesterId: userIdA, addresseeId: userIdB },
          { requesterId: userIdB, addresseeId: userIdA },
        ],
      },
    });
    return !!friendship;
  }

  /** Batched sibling of areFriends — one query for all of userId's accepted friends, for callers (e.g. Story's feed gating) that need to check many candidates at once instead of one query per pair. */
  async getFriendIds(userId: string): Promise<Set<string>> {
    const rows = await this.prisma.friendship.findMany({
      where: { status: 'accepted', OR: [{ requesterId: userId }, { addresseeId: userId }] },
      select: { requesterId: true, addresseeId: true },
    });
    return new Set(rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId)));
  }
}
