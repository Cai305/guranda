import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  // Same complexity rule enforced at registration (see
  // register-user.dto.ts's RegisterUserValidatedDto.passwordHash) — kept in
  // sync so a changed password can't be weaker than a freshly registered one.
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  newPassword: string;
}
