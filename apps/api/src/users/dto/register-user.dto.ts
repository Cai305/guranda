import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { RegisterUserDto } from '@mxit2/types';

// Implements the shared @mxit2/types interface (also used by the mobile
// client for compile-time typing) but adds class-validator decorators so
// NestJS's ValidationPipe can actually enforce shape/length/format at this
// boundary — the interface alone gives zero runtime protection.
export class RegisterUserValidatedDto implements RegisterUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'username may only contain letters, numbers, and underscores',
  })
  username: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  // Field name is misleading (holds the raw password, hashed downstream in
  // UsersService) — kept as-is to match the existing shared interface/mobile
  // client contract rather than renaming across both repos for this pass.
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  passwordHash: string;

  @IsBoolean()
  isSelfCustodial: boolean;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  firstName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  lastName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  occupation: string;
}
