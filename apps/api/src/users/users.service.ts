import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { Db } from '../db';
import { DB_TOKEN } from '../db/db.module';
import { users, patternProgress } from '../db/schema';
import type { UserTier } from '@interview-mind/shared';

@Injectable()
export class UsersService {
  constructor(@Inject(DB_TOKEN) private readonly db: Db) {}

  async findById(id: string) {
    const user = await this.db.query.users.findFirst({ where: eq(users.id, id) });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async findByEmail(email: string) {
    return this.db.query.users.findFirst({ where: eq(users.email, email) });
  }

  async upsertFromOnboarding(data: {
    email: string;
    displayName: string;
    calibrationScore: number;
    tier: UserTier;
    persona: string;
    preferredMode: string;
  }) {
    const existing = await this.findByEmail(data.email);

    if (existing) {
      const [updated] = await this.db
        .update(users)
        .set({
          displayName: data.displayName,
          calibrationScore: data.calibrationScore,
          tier: data.tier,
          persona: data.persona,
          preferredMode: data.preferredMode,
          onboardingComplete: true,
        })
        .where(eq(users.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await this.db
      .insert(users)
      .values({ ...data, onboardingComplete: true })
      .returning();
    return created;
  }

  async getPatternProgress(userId: string) {
    return this.db.query.patternProgress.findMany({
      where: eq(patternProgress.userId, userId),
    });
  }
}
