import { Module } from '@nestjs/common';
import { PerformancesController } from './performances.controller';
import { PerformancesService } from './performances.service';
import { SongsModule } from '../songs/songs.module';
import { BlocksModule } from '../blocks/blocks.module';

@Module({
  imports: [SongsModule, BlocksModule],
  controllers: [PerformancesController],
  providers: [PerformancesService],
  exports: [PerformancesService],
})
export class PerformancesModule {}
