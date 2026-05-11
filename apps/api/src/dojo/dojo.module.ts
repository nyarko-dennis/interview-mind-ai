import { Module } from '@nestjs/common';
import { DojoService } from './dojo.service';
import { DojoController } from './dojo.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  providers: [DojoService],
  controllers: [DojoController],
})
export class DojoModule {}
