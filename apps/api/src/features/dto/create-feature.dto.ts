import { IsEnum, IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';
import { FeaturePricingType, MarketplaceVisibility } from '@prisma/client';

export class CreateFeatureDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(2000)
  description: string;

  @IsString()
  @MaxLength(50)
  category: string;

  @IsString()
  @MaxLength(50)
  icon: string;

  // [start, end] hex pair, same shape as LifeModule.gradient — validated
  // loosely (array of strings) rather than exactly length-2 so a future
  // 3-stop gradient isn't a breaking schema change here.
  @IsOptional()
  @IsString({ each: true })
  gradientColors?: string[];

  @IsOptional()
  @IsEnum(FeaturePricingType)
  pricingType?: FeaturePricingType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsEnum(MarketplaceVisibility)
  visibility?: MarketplaceVisibility;
}
