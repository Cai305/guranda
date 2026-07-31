import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { FeatureAccess } from '@prisma/client';

// Every module/mini-app/game the admin dashboard can control. Any key not
// yet in the DB defaults to ALL, so new modules ship open by default.
export const FEATURE_KEYS = [
  'ai',
  'discovery',
  'live',
  'social',
  'games',
  'ride',
  'eat',
  'property',
  'miniapps',
  'moonbase',
  'pool',
  'ludo',
  'chess',
  'murabaraba',
  'wordbattle',
  'marketplace',
  'wallet',
  'creatorFunds',
  'shopping',
  'travel',
  'work',
  'health',
  'finance',
  'learning',
  'carfind',
] as const;

@Injectable()
export class FeatureFlagsService {
  constructor(private prisma: PrismaService) {}

  async getAll() {
    const rows = await this.prisma.featureFlag.findMany();
    const map: Record<string, FeatureAccess> = {};
    for (const key of FEATURE_KEYS) map[key] = FeatureAccess.ALL;
    for (const row of rows) map[row.key] = row.access;
    return map;
  }

  async set(key: string, access: FeatureAccess) {
    if (!Object.values(FeatureAccess).includes(access)) {
      throw new BadRequestException(`Invalid access level: ${access}`);
    }
    return this.prisma.featureFlag.upsert({
      where: { key },
      update: { access },
      create: { key, access },
    });
  }
}
