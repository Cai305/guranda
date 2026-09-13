import { IsString, MinLength } from 'class-validator';

export class SetPayShapNumberDto {
  @IsString()
  @MinLength(4)
  number: string;
}
