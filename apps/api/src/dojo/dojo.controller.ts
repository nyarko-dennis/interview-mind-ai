import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { DojoService } from './dojo.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';

@Controller('dojo')
@UseGuards(JwtAuthGuard)
export class DojoController {
  constructor(private readonly dojo: DojoService) {}

  @Get('tips')
  getTips(
    @Query('category') category: string,
    @Query('key') key: string,
    @Query('mode') mode: string = 'ALL',
  ) {
    return this.dojo.getTips(category, key, mode);
  }

  @Get('drills')
  getDrills(
    @Query('type') type: string,
    @Query('pattern') pattern?: string,
  ) {
    return this.dojo.getDrills(type, pattern);
  }

  @Post('attempts')
  submitAttempt(
    @CurrentUser() user: AuthUser,
    @Body() body: { drillId: string; answer: string },
  ) {
    return this.dojo.submitAttempt(user.id, body.drillId, body.answer);
  }

  @Get('progress')
  getProgress(@CurrentUser() user: AuthUser) {
    return this.dojo.getProgress(user.id);
  }

  @Get('weak-patterns')
  getWeakPatterns(@CurrentUser() user: AuthUser) {
    return this.dojo.getWeakPatterns(user.id);
  }

  @Get('weekly-summary')
  getWeeklySummary(@CurrentUser() user: AuthUser) {
    return this.dojo.getWeeklySummary(user.id);
  }
}
