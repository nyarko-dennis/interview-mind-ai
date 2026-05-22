import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { Db } from '../db';
import { DB_TOKEN } from '../db/db.module';
import { problems, hints } from '../db/schema';

@Injectable()
export class ProblemsService {
  constructor(@Inject(DB_TOKEN) private readonly db: Db) {}

  async findAll(filters?: { pattern?: string; difficulty?: string }) {
    const conditions = [];
    if (filters?.pattern) conditions.push(eq(problems.pattern, filters.pattern));
    if (filters?.difficulty) conditions.push(eq(problems.difficulty, filters.difficulty));
    const rows = await this.db.query.problems.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
    });
    return rows;
  }

  async findBySlug(slug: string) {
    const problem = await this.db.query.problems.findFirst({
      where: eq(problems.slug, slug),
    });
    if (!problem) throw new NotFoundException(`Problem "${slug}" not found`);
    return problem;
  }

  async findById(id: string) {
    const problem = await this.db.query.problems.findFirst({
      where: eq(problems.id, id),
    });
    if (!problem) throw new NotFoundException(`Problem ${id} not found`);
    return problem;
  }

  async getHintByLevel(problemId: string, level: number) {
    return this.db.query.hints.findFirst({
      where: and(eq(hints.problemId, problemId), eq(hints.level, level)),
    });
  }

  async getHints(problemId: string, upToLevel: number) {
    return this.db.query.hints.findMany({
      where: eq(hints.problemId, problemId),
    }).then((rows) => rows.filter((h) => h.level <= upToLevel));
  }
}
