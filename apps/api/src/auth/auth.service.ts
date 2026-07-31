import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  generateToken(userId: string, username: string): string {
    const payload = { sub: userId, username };
    return this.jwtService.sign(payload);
  }
}
