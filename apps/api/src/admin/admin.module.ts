import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAccessGuard } from './admin-access.guard';
import { AdminAuditService } from './admin-audit.service';
import { PrismaService } from '../prisma.service';
import { JWT_SECRET } from '../auth/jwt-secret';

@Module({
  imports: [JwtModule.register({ secret: JWT_SECRET })],
  controllers: [AdminController],
  providers: [AdminService, PrismaService, AdminAccessGuard, AdminAuditService],
  exports: [AdminAccessGuard, AdminAuditService, JwtModule],
})
export class AdminModule {}
