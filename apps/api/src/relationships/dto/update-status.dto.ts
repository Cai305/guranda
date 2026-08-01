import { IsEnum } from 'class-validator';
import { RelationshipStatusType } from '@prisma/client';

export class UpdateRelationshipStatusDto {
  @IsEnum(RelationshipStatusType)
  status: RelationshipStatusType;
}
