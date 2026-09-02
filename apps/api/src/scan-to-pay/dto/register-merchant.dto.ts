import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterMerchantDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(40)
  category: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  // The merchant's first store — a merchant can't accept Scan to Pay
  // without at least one, so it's created in the same call.
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  storeName: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  storeAddress?: string;
}
