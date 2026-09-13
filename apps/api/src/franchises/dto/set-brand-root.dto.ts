import { IsString } from 'class-validator';

export class SetBrandRootDto {
  @IsString()
  businessId: string;

  @IsString()
  usernameId: string;
}
