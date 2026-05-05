import { Module } from '@nestjs/common';
import { MemoryController } from './memory.controller';
import { MemoryService } from './memory.service';
import { ProfileExtractorService } from './profile-extractor.service';

@Module({
  controllers: [MemoryController],
  providers: [MemoryService, ProfileExtractorService],
})
export class MemoryModule {}
