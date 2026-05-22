import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ProgramsService, ProgramType } from './programs.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';

@Controller('programs')
@UseGuards(JwtAuthGuard)
export class ProgramsController {
  constructor(private readonly programs: ProgramsService) {}

  @Get()
  getPrograms(@CurrentUser() user: AuthUser) {
    return this.programs.getPrograms(user.id);
  }

  @Post()
  enroll(
    @CurrentUser() user: AuthUser,
    @Body() body: { type: ProgramType; config?: { pattern?: string } },
  ) {
    return this.programs.upsertProgram(user.id, body.type, body.config ?? {});
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { active?: boolean; config?: { pattern?: string } },
  ) {
    return this.programs.updateProgram(user.id, id, body);
  }

  @Get('today')
  getToday(@CurrentUser() user: AuthUser) {
    return this.programs.getTodayAssignments(user.id);
  }

  @Post('interview-sim/start')
  startInterviewSim(@CurrentUser() user: AuthUser) {
    return this.programs.startInterviewSim(user.id);
  }

  @Post('assignments/:id/start')
  startAssignment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { preferredMode?: string },
  ) {
    return this.programs.startAssignment(user.id, id, body.preferredMode ?? 'GUIDED');
  }
}
