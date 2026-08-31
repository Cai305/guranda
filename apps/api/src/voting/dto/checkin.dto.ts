import { IsIn } from 'class-validator';

export class CheckInDto {
  @IsIn(['FINGERPRINT', 'FACE_ID'])
  method: 'FINGERPRINT' | 'FACE_ID';
}
