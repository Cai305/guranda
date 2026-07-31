import { IsLatitude, IsLongitude, IsOptional, IsString, MaxLength } from 'class-validator';

export class SaveLocationDto {
  @IsLatitude()
  lat: number;

  @IsLongitude()
  lng: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;
}
