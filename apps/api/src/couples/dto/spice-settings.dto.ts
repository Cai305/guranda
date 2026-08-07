import { IsBoolean, IsIn } from 'class-validator';

const SPICE_LEVELS = ['SWEET', 'FLIRTY', 'SPICY'] as const;
const PROMPT_TYPES = ['TRUTH', 'DARE', 'CARD'] as const;

export class SetSpiceLevelDto {
  @IsIn(SPICE_LEVELS)
  level: 'SWEET' | 'FLIRTY' | 'SPICY';
}

export class SetSpicyOptInDto {
  @IsBoolean()
  optIn: boolean;
}

export class DrawPromptDto {
  @IsIn(PROMPT_TYPES)
  type: 'TRUTH' | 'DARE' | 'CARD';
}
