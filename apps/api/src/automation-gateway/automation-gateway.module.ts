import { Module } from '@nestjs/common';
import { AutomationGatewayController } from './automation-gateway.controller';
import { AutomationGatewayService } from './automation-gateway.service';

// PrismaService is provided globally by PrismaModule — never re-declared in
// a feature module's own providers array (see CLAUDE.md / prior session
// fix across 68 files).
@Module({
  controllers: [AutomationGatewayController],
  providers: [AutomationGatewayService],
  exports: [AutomationGatewayService],
})
export class AutomationGatewayModule {}
