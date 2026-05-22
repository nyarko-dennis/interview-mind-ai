import { Module } from '@nestjs/common';
import { PistonService } from './piston.service';

@Module({
  providers: [PistonService],
  exports: [PistonService],
})
export class PistonModule {}
