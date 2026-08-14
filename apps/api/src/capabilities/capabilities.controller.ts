import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CapabilityManifestService } from './capability-manifest.service';

// The actual platform query surface docs/18 §12 describes — what a future
// mini app, voice surface, or third-party integration would introspect to
// know what Guranda can do. Authenticated (not public) since the manifest
// includes each tool's raw inputSchema — no reason to hand that to an
// unauthenticated caller today.
@Controller('capabilities')
@UseGuards(JwtAuthGuard)
export class CapabilitiesController {
  constructor(private manifest: CapabilityManifestService) {}

  @Get()
  list() {
    return this.manifest.generate();
  }
}
