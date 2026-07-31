import { Module } from '@nestjs/common';
import { PropertyController } from './property.controller';
import { PropertyService } from './property.service';
import { PropertyAiToolsProvider } from './property-ai-tools.provider';
import { PrismaService } from '../prisma.service';
import { VerificationModule } from '../verification/verification.module';

@Module({
  imports: [VerificationModule],
  controllers: [PropertyController],
  providers: [PropertyService, PrismaService, PropertyAiToolsProvider],
  exports: [PropertyService],
})
export class PropertyModule {}
