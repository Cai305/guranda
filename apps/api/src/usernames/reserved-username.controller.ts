import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { normalizeUsernameLabel } from './username-validation.util';
import { UsernameService } from './username.service';
import { AdminAccessGuard } from '../admin/admin-access.guard';
import { AdminAuditService } from '../admin/admin-audit.service';

// Was fully unauthenticated, including seed-asset (mints a reserved handle
// directly to any ownerId — a real economy-integrity risk if left open).
// Gated the same way as the rest of the admin surface (see
// admin/admin-access.guard.ts).
@UseGuards(AdminAccessGuard)
@Controller('admin/reserved-usernames')
export class ReservedUsernameAdminController {
  constructor(
    private prisma: PrismaService,
    private usernameService: UsernameService,
    private audit: AdminAuditService,
  ) {}

  @Get()
  list() {
    return this.prisma.reservedUsername.findMany({ orderBy: { label: 'asc' } });
  }

  @Post()
  async add(@Body() body: { label: string; reason?: string }, @Request() req: any) {
    const label = normalizeUsernameLabel(body.label);
    const result = await this.prisma.reservedUsername.create({
      data: { label, reason: body.reason },
    });
    await this.audit.log(req.admin, 'reserved-username.add', {
      type: 'ReservedUsername',
      id: label,
    });
    return result;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    const result = await this.prisma.reservedUsername.delete({ where: { id } });
    await this.audit.log(req.admin, 'reserved-username.remove', {
      type: 'ReservedUsername',
      id,
    });
    return result;
  }

  // How a reserved brand handle actually enters the marketplace as a
  // sellable asset — mints it directly to a chosen owner, bypassing the
  // ordinary reserved-name gate (that gate is what THIS endpoint exists to
  // deliberately bypass, on purpose, for exactly this case).
  @Post(':label/seed-asset')
  async seedAsset(
    @Param('label') label: string,
    @Body() body: { ownerId: string },
    @Request() req: any,
  ) {
    const normalized = normalizeUsernameLabel(label);
    const result = await this.usernameService.adminSeedReservedAsset(
      normalized,
      body.ownerId,
    );
    await this.audit.log(
      req.admin,
      'reserved-username.seed-asset',
      { type: 'ReservedUsername', id: normalized },
      { ownerId: body.ownerId },
    );
    return result;
  }
}
