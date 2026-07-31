import { IsEnum } from 'class-validator';
import { FeatureAccess } from '@prisma/client';

export class SetFeatureFlagDto {
  @IsEnum(FeatureAccess)
  access: FeatureAccess;
}
