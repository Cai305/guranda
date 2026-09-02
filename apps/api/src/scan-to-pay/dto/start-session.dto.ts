import { IsArray, IsOptional, IsNumber, IsString, Min, ArrayMaxSize } from 'class-validator';

export class StartSessionDto {
  @IsString()
  merchantId: string;

  @IsString()
  storeId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  groceryList?: string[];
}
