import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  assertUsernameClaimable,
  normalizeUsernameLabel,
} from '../usernames/username-validation.util';
import { FRANCHISE_STAFF_ROLES, FranchiseStaffRole } from './dto/add-franchise-staff.dto';

const STAFF_SELECT = {
  id: true,
  username: true,
  profile: { select: { displayName: true, avatarUrl: true } },
} as const;

// Franchise tenancy on top of the existing Username marketplace (Phase 7).
// A verified Business can own a root brand Username plus N franchise-location
// Usernames beneath it (Username.parentUsernameId / businessId — see
// schema.prisma). Each location gets its own scoped staff roster
// (FranchiseStaff) and can author its own franchise-scoped Campaigns,
// distinguishable from the parent's global campaigns.
//
// Nothing here touches UsernameService's existing personal-alias ownership
// or marketplace transfer logic — canActAsAlias() below is purely additive,
// same "owner path untouched, extra path layered on top" shape as
// BlueprintExecutionService.assertCanRun.
@Injectable()
export class FranchisesService {
  constructor(private prisma: PrismaService) {}

  // Mirrors CampaignsService.findEligibleBusiness exactly — the one real
  // "is this user a verified business owner" check already in the codebase.
  // Kept as its own copy (not imported from CampaignsService, which doesn't
  // export it) to avoid a cross-module private-method dependency; if this
  // duplicates again anywhere else it should move to a shared verification
  // helper.
  async findEligibleBusiness(userId: string) {
    const verification = await this.prisma.verification.findUnique({
      where: { userId },
      include: { businesses: true },
    });
    if (
      !verification ||
      !verification.hasBusiness ||
      verification.status !== 'VERIFIED' ||
      verification.businesses.length === 0
    ) {
      return null;
    }
    return verification.businesses[0];
  }

  private async assertOwnsBusiness(userId: string, businessId: string) {
    const business = await this.findEligibleBusiness(userId);
    if (!business || business.id !== businessId) {
      throw new ForbiddenException(
        'Only the verified owner of this business can do this',
      );
    }
    return business;
  }

  async findUserIdByUsername(rawLabel: string): Promise<string | null> {
    const label = normalizeUsernameLabel(rawLabel.replace(/^@/, ''));
    const user = await this.prisma.user.findUnique({ where: { username: label } });
    return user?.id ?? null;
  }

  // ── Hierarchy ─────────────────────────────────────────────────────────

  /** Real query: the business's root brand alias plus every franchise-location alias beneath it, each with its live (non-revoked) staff roster — the "manage my franchises" dashboard. */
  async getFranchiseHierarchy(userId: string, businessId: string) {
    await this.assertOwnsBusiness(userId, businessId);

    const usernames = await this.prisma.username.findMany({
      where: { businessId },
      include: {
        staffRoster: {
          where: { revokedAt: null },
          include: { user: { select: STAFF_SELECT } },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const parent = usernames.find((u) => !u.parentUsernameId) ?? null;
    const children = usernames.filter((u) => u.parentUsernameId);
    return { parent, children };
  }

  // ── Designate a root brand alias ────────────────────────────────────────

  /**
   * One-time setup step: designates one of the caller's OWN existing
   * personal aliases as their verified business's root brand alias — the
   * parent createFranchiseAlias() attaches child locations beneath. Only
   * the verified business owner, only on an alias they own that isn't
   * already part of any franchise hierarchy, and only one root per
   * business. This is purely additive to the alias — its ownership,
   * marketplace listing state and reputation are all untouched; it just
   * gains a businessId.
   */
  async setBrandRootAlias(userId: string, businessId: string, usernameId: string) {
    await this.assertOwnsBusiness(userId, businessId);

    const username = await this.prisma.username.findUnique({ where: { id: usernameId } });
    if (!username) throw new NotFoundException('Alias not found');
    if (username.ownerId !== userId) {
      throw new ForbiddenException('You do not own this alias');
    }
    if (username.businessId) {
      throw new BadRequestException('This alias is already tied to a business hierarchy');
    }
    if (username.parentUsernameId) {
      throw new BadRequestException('A franchise location cannot itself become a root brand alias');
    }

    const existingRoot = await this.prisma.username.findFirst({
      where: { businessId, parentUsernameId: null },
    });
    if (existingRoot) {
      throw new BadRequestException('This business already has a root brand alias');
    }

    return this.prisma.username.update({
      where: { id: usernameId },
      data: { businessId },
    });
  }

  // ── Create a franchise-location alias ───────────────────────────────────

  /**
   * Only the verified owner of the business that owns `parentUsernameId` may
   * mint a new child alias beneath it. Reuses assertUsernameClaimable — the
   * exact same label validity/uniqueness gate the free-claim and mint paths
   * already enforce, never relaxed for franchise aliases.
   */
  async createFranchiseAlias(
    userId: string,
    businessId: string,
    parentUsernameId: string,
    newAliasName: string,
  ) {
    await this.assertOwnsBusiness(userId, businessId);

    const parent = await this.prisma.username.findUnique({
      where: { id: parentUsernameId },
    });
    if (!parent) throw new NotFoundException('Parent alias not found');
    if (parent.businessId !== businessId) {
      throw new BadRequestException(
        'That alias does not belong to your business — cannot attach a franchise location to it',
      );
    }
    // One-level hierarchy only, matching the directive's "root brand + N
    // franchise locations" shape — a location can't itself have locations.
    if (parent.parentUsernameId) {
      throw new BadRequestException(
        'Franchise locations cannot themselves have sub-locations',
      );
    }

    const label = await assertUsernameClaimable(this.prisma, newAliasName);

    return this.prisma.username.create({
      data: {
        label,
        ownerId: userId,
        acquiredVia: 'FRANCHISE_GRANT',
        parentUsernameId,
        businessId,
      },
    });
  }

  // ── Staff ────────────────────────────────────────────────────────────

  private async loadFranchiseLocation(franchiseUsernameId: string) {
    const franchise = await this.prisma.username.findUnique({
      where: { id: franchiseUsernameId },
    });
    if (!franchise) throw new NotFoundException('Franchise location not found');
    if (!franchise.parentUsernameId || !franchise.businessId) {
      throw new BadRequestException('That alias is not a franchise location');
    }
    return franchise;
  }

  /** Real permission gate: the alias's current owner, the parent business's verified owner, or an existing active MANAGER of THIS location — never a plain STAFF member. */
  private async assertCanManageStaff(actingUserId: string, franchiseUsernameId: string) {
    const franchise = await this.loadFranchiseLocation(franchiseUsernameId);

    if (franchise.ownerId === actingUserId) return franchise;

    const business = await this.findEligibleBusiness(actingUserId);
    if (business && business.id === franchise.businessId) return franchise;

    const manager = await this.prisma.franchiseStaff.findFirst({
      where: {
        franchiseUsernameId,
        userId: actingUserId,
        revokedAt: null,
        role: 'MANAGER',
      },
    });
    if (manager) return franchise;

    throw new ForbiddenException(
      'Only the business owner or a manager of this franchise location can manage its staff',
    );
  }

  async addFranchiseStaff(
    actingUserId: string,
    franchiseUsernameId: string,
    targetUserId: string,
    role: FranchiseStaffRole,
  ) {
    if (!FRANCHISE_STAFF_ROLES.includes(role)) {
      throw new BadRequestException('role must be MANAGER or STAFF');
    }
    await this.assertCanManageStaff(actingUserId, franchiseUsernameId);

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) throw new NotFoundException('User not found');

    const existing = await this.prisma.franchiseStaff.findFirst({
      where: { franchiseUsernameId, userId: targetUserId, revokedAt: null },
    });
    if (existing) {
      throw new BadRequestException(
        'This user already has active staff access to this location',
      );
    }

    return this.prisma.franchiseStaff.create({
      data: {
        franchiseUsernameId,
        userId: targetUserId,
        role,
        invitedByUserId: actingUserId,
      },
      include: { user: { select: STAFF_SELECT } },
    });
  }

  /** Soft-revoke — matches FeatureInstallation.uninstalledAt's convention. */
  async removeFranchiseStaff(actingUserId: string, staffId: string) {
    const staff = await this.prisma.franchiseStaff.findUnique({
      where: { id: staffId },
    });
    if (!staff) throw new NotFoundException('Staff row not found');
    await this.assertCanManageStaff(actingUserId, staff.franchiseUsernameId);
    if (staff.revokedAt) return staff;
    return this.prisma.franchiseStaff.update({
      where: { id: staffId },
      data: { revokedAt: new Date() },
    });
  }

  /** Read access: alias owner, parent business owner, or any currently-active staff member of that one location (a STAFF member can see their own roster, just can't edit it). */
  async listFranchiseStaff(actingUserId: string, franchiseUsernameId: string) {
    const franchise = await this.loadFranchiseLocation(franchiseUsernameId);

    const canView =
      franchise.ownerId === actingUserId ||
      (await this.canActAsAlias(actingUserId, franchiseUsernameId)) ||
      (await this.findEligibleBusiness(actingUserId))?.id === franchise.businessId;

    if (!canView) {
      throw new ForbiddenException("Not authorized to view this location's staff");
    }

    return this.prisma.franchiseStaff.findMany({
      where: { franchiseUsernameId, revokedAt: null },
      include: { user: { select: STAFF_SELECT } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Every franchise location this user currently has active (non-revoked) staff access to — lets a staff member (who may not be a verified business owner themselves) discover which location(s) they can create franchise-scoped content for. */
  async myStaffMemberships(userId: string) {
    return this.prisma.franchiseStaff.findMany({
      where: { userId, revokedAt: null },
      include: {
        franchiseUsername: {
          select: { id: true, label: true, businessId: true, parentUsernameId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Authorization helper wired into content/campaign creation ──────────

  /**
   * Real "can this user act as this alias" check — returns true if the user
   * IS the alias's owner (the untouched, pre-existing rule for every alias
   * in the app) OR is an active, non-revoked FranchiseStaff member of THIS
   * specific franchise-location Username (additive — never applies to the
   * parent brand alias or a sibling location, since FranchiseStaff rows are
   * scoped to exactly one franchiseUsernameId).
   *
   * Same "owner path untouched, extra path layered on top" shape as
   * BlueprintExecutionService.assertCanRun.
   */
  async canActAsAlias(userId: string, usernameId: string): Promise<boolean> {
    const username = await this.prisma.username.findUnique({
      where: { id: usernameId },
      select: { ownerId: true },
    });
    if (!username) return false;
    if (username.ownerId === userId) return true;

    const staff = await this.prisma.franchiseStaff.findFirst({
      where: { franchiseUsernameId: usernameId, userId, revokedAt: null },
    });
    return !!staff;
  }
}
