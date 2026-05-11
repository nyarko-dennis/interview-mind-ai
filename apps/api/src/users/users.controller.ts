import { Body, Controller, Get, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/jwt.strategy';
import type { UserTier } from '@interview-mind/shared';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() user: AuthUser) {
    const found = await this.usersService.findByEmail(user.email);
    if (!found) throw new NotFoundException('User not found');
    return found;
  }

  @Post('onboarding')
  completeOnboarding(
    @Body()
    body: {
      email: string;
      displayName: string;
      calibrationScore: number;
      tier: UserTier;
      persona: string;
      preferredMode: string;
    },
  ) {
    return this.usersService.upsertFromOnboarding(body);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Get(':id/progress')
  getProgress(@Param('id') id: string) {
    return this.usersService.getPatternProgress(id);
  }
}
