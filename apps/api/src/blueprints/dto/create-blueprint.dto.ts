import { IsArray, IsEnum, IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';
import { FeaturePricingType, MarketplaceVisibility } from '@prisma/client';

export class CreateBlueprintDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(2000)
  description: string;

  @IsOptional()
  @IsEnum(MarketplaceVisibility)
  visibility?: MarketplaceVisibility;

  // Feature.id values this Blueprint depends on — validated against real
  // Feature rows in the service (needs Prisma, not a pure decorator check).
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredFeatureIds?: string[];

  // Phase 4 Marketplace pricing — reuses FeaturePricingType (see
  // schema.prisma's Blueprint.pricingType comment for why there's no
  // separate BlueprintPricingType enum).
  @IsOptional()
  @IsEnum(FeaturePricingType)
  pricingType?: FeaturePricingType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}
