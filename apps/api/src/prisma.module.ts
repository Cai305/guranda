import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Every feature module used to list PrismaService in its own `providers:`
// array, so Nest instantiated a SEPARATE PrismaClient (and its own
// connection_limit=2 pool) per module — 68 modules meant ~70+ live Postgres
// connections just from booting the app once, which is what kept exhausting
// max_connections=100 in dev. @Global() + a single shared instance here
// fixes that: every module now resolves the same PrismaService from this
// one module instead of creating its own.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
