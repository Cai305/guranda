import { IsEnum } from 'class-validator';
import { FeatureStatus } from '@prisma/client';

export class UpdateFeatureStatusDto {
  @IsEnum(FeatureStatus)
  status: FeatureStatus;
}
