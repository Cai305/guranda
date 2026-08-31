import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

const STRUCTURE_TYPES = ['HOA', 'CORPORATE', 'UNION', 'CLUB', 'STUDENT_BODY', 'OTHER'];

export class CreateStructureDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @IsIn(STRUCTURE_TYPES)
  type: string;
}
