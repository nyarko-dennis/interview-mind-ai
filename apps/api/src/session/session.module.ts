import { Module } from '@nestjs/common';
import { SessionService } from './session.service';
import { SessionGateway } from './session.gateway';
import { SessionController } from './session.controller';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';
import { Judge0Module } from '../judge0/judge0.module';
import { ProblemsModule } from '../problems/problems.module';
import { ScoringModule } from '../scoring/scoring.module';

@Module({
  imports: [AiModule, AuthModule, Judge0Module, ProblemsModule, ScoringModule],
  providers: [SessionService, SessionGateway],
  controllers: [SessionController],
})
export class SessionModule {}
