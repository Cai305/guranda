import { IsEnum } from 'class-validator';
import { BlueprintStatus } from '@prisma/client';

export class UpdateBlueprintStatusDto {
  @IsEnum(BlueprintStatus)
  status: BlueprintStatus;
}
