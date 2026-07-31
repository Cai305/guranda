import { IsString, MinLength } from 'class-validator';

export class SavePushTokenDto {
  @IsString()
  @MinLength(1)
  token: string;
}
