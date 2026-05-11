import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProblemsService } from './problems.service';

@Controller('problems')
export class ProblemsController {
  constructor(private readonly problemsService: ProblemsService) {}

  @Get()
  findAll(@Query('pattern') pattern?: string, @Query('difficulty') difficulty?: string) {
    return this.problemsService.findAll({ pattern, difficulty });
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.problemsService.findBySlug(slug);
  }
}
