import { Module } from '@nestjs/common';
import { SessionService } from './session.service';
import { SessionGateway } from './session.gateway';
import { SessionController } from './session.controller';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';
import { PistonModule } from '../piston/piston.module';
import { ProblemsModule } from '../problems/problems.module';
import { ScoringModule } from '../scoring/scoring.module';

@Module({
  imports: [AiModule, AuthModule, PistonModule, ProblemsModule, ScoringModule],
  providers: [SessionService, SessionGateway],
  controllers: [SessionController],
})
export class SessionModule {}
