import { Module } from '@nestjs/common';
import { MoonbaseGateway } from './moonbase.gateway';

@Module({
  providers: [MoonbaseGateway],
})
export class MoonbaseModule {}
