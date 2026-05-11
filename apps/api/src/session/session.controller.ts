import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { SessionService } from './session.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import type { InterviewerMode } from '@interview-mind/shared';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  findForUser(@CurrentUser() user: AuthUser) {
    return this.sessionService.findForUser(user.id);
  }

  @Post()
  create(
    @Body() body: { userId: string; problemId: string; mode: InterviewerMode },
  ) {
    return this.sessionService.create(body);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sessionService.getById(id);
  }
}
