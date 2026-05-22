import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from './db/db.module';
import { AuthModule } from './auth/auth.module';
import { SessionModule } from './session/session.module';
import { AiModule } from './ai/ai.module';
import { PistonModule } from './piston/piston.module';
import { ProblemsModule } from './problems/problems.module';
import { UsersModule } from './users/users.module';
import { ScoringModule } from './scoring/scoring.module';
import { DojoModule } from './dojo/dojo.module';
import { ProgramsModule } from './programs/programs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    AuthModule,
    UsersModule,
    ProblemsModule,
    AiModule,
    PistonModule,
    ScoringModule,
    SessionModule,
    DojoModule,
    ProgramsModule,
  ],
})
export class AppModule {}
