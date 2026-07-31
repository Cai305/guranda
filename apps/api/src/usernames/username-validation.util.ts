import { BadRequestException, ConflictException } from '@nestjs/common';

export function normalizeUsernameLabel(raw: string): string {
  return (raw ?? '').trim().toLowerCase();
}

/** Shared gate for every path that mints a NEW username label: free registration claim, extra mints, and a defensive re-check before listing. Does not apply to labels a Username row already legitimately holds (transfers, admin seeds). */
export async function assertUsernameClaimable(
  prisma: {
    reservedUsername: { findUnique: Function };
    username: { findUnique: Function };
  },
  rawOrNormalized: string,
): Promise<string> {
  const label = normalizeUsernameLabel(rawOrNormalized);
  if (label.length < 3)
    throw new BadRequestException('Usernames must be at least 3 characters');
  if (!/^[a-z0-9_]+$/.test(label))
    throw new BadRequestException(
      'Usernames may only contain letters, numbers and underscores',
    );
  if (await prisma.reservedUsername.findUnique({ where: { label } })) {
    throw new ConflictException(`"${label}" is reserved and not available`);
  }
  if (await prisma.username.findUnique({ where: { label } })) {
    throw new ConflictException('Username already taken');
  }
  return label;
}
