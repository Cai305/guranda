import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateFranchiseAliasDto {
  @IsString()
  businessId: string;

  @IsString()
  parentUsernameId: string;

  @IsString()
  @MinLength(3)
  @MaxLength(30)
  newAliasName: string;
}
