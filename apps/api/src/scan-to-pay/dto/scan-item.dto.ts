import { IsInt, IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';

export class ScanItemDto {
  @IsString()
  @MaxLength(64)
  barcode: string;

  @IsString()
  @MaxLength(120)
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  qty?: number;
}

export class UpdateItemDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  qty?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}
