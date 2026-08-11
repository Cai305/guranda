import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { FeatureFlagsService } from './feature-flags.service';
import { AdminAccessGuard } from '../admin/admin-access.guard';
import { AdminAuditService } from '../admin/admin-audit.service';
import { SetFeatureFlagDto } from './dto/set-feature-flag.dto';

@Controller('feature-flags')
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  // Public endpoint — cache for 5 minutes. Feature flags change only when an
  // admin explicitly toggles one, so we get huge read savings at zero UX cost.
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300_000) // 5 minutes in ms
  @Get()
  getAll() {
    return this.featureFlagsService.getAll();
  }
}

// Was fully unauthenticated on the write route — anyone could toggle any
// module (ai, wallet, games, ...) off for the entire platform. Gated the
// same way as the rest of the admin surface (see admin/admin-access.guard.ts).
@UseGuards(AdminAccessGuard)
@Controller('admin/feature-flags')
export class AdminFeatureFlagsController {
  constructor(
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly audit: AdminAuditService,
  ) {}

  @Get()
  getAll() {
    return this.featureFlagsService.getAll();
  }

  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @Post(':key')
  async set(
    @Param('key') key: string,
    @Body() body: SetFeatureFlagDto,
    @Request() req: any,
  ) {
    const result = await this.featureFlagsService.set(key, body.access);
    await this.audit.log(req.admin, 'feature-flag.set', {
      type: 'FeatureFlag',
      id: key,
    }, { access: body.access });
    return result;
  }
}
