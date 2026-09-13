import { IsIn, IsString } from 'class-validator';

export const FRANCHISE_STAFF_ROLES = ['MANAGER', 'STAFF'] as const;
export type FranchiseStaffRole = (typeof FRANCHISE_STAFF_ROLES)[number];

export class AddFranchiseStaffDto {
  @IsString()
  targetUserId: string;

  @IsIn(FRANCHISE_STAFF_ROLES)
  role: FranchiseStaffRole;
}
