import {
  pgTable,
  uuid,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  date,
  unique,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  tier: text('tier').notNull().default('NOVICE'),
  persona: text('persona'),
  preferredMode: text('preferred_mode').notNull().default('GUIDED'),
  calibrationScore: integer('calibration_score'),
  onboardingComplete: boolean('onboarding_complete').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const problems = pgTable('problems', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  pattern: text('pattern').notNull(),
  difficulty: text('difficulty').notNull(),
  statement: text('statement').notNull(),
  hintCeiling: integer('hint_ceiling').notNull().default(2),
  optimalTimeComplexity: text('optimal_time_complexity'),
  functionStub: text('function_stub'),
  testRunner: text('test_runner'),
  functionStubs: jsonb('function_stubs').notNull().default('{}'),
  testRunners: jsonb('test_runners').notNull().default('{}'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const hints = pgTable('hints', {
  id: uuid('id').primaryKey().defaultRandom(),
  problemId: uuid('problem_id')
    .notNull()
    .references(() => problems.id, { onDelete: 'cascade' }),
  level: integer('level').notNull(),
  content: text('content').notNull(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  problemId: uuid('problem_id')
    .notNull()
    .references(() => problems.id),
  phase: text('phase').notNull().default('IDLE'),
  mode: text('mode').notNull(),
  persona: text('persona').notNull().default('STANDARD'),
  freePlay: boolean('free_play').notNull().default(false),
  hintsUsed: jsonb('hints_used').notNull().default('[]'),
  maxHintLevel: integer('max_hint_level').notNull().default(0),
  clarificationAttempts: integer('clarification_attempts').notNull().default(0),
  clarificationCoverage: jsonb('clarification_coverage').notNull().default('{"INPUT":0,"OUTPUT":0,"CONSTRAINTS":0,"EDGE_CASES":0}'),
  approachStep: text('approach_step'),
  approachHistory: jsonb('approach_history').notNull().default('{"NAIVE":[],"IMPROVE":[],"OPTIMAL":[]}'),

  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
});

export const submissions = pgTable('submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  language: text('language').notNull(),
  code: text('code').notNull(),
  judge0Token: text('judge0_token'),
  status: text('status'),
  testsPassed: integer('tests_passed'),
  testsTotal: integer('tests_total'),
  runtimeMs: integer('runtime_ms'),
  memoryKb: integer('memory_kb'),
  submittedAt: timestamp('submitted_at').notNull().defaultNow(),
});

export const scores = pgTable('scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' })
    .unique(),
  correctness: real('correctness').notNull(),
  efficiency: real('efficiency').notNull(),
  communication: real('communication').notNull(),
  independence: real('independence').notNull(),
  total: real('total').notNull(),
  debriefReport: text('debrief_report'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const patternProgress = pgTable('pattern_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  pattern: text('pattern').notNull(),
  problemsAttempted: integer('problems_attempted').notNull().default(0),
  problemsSolved: integer('problems_solved').notNull().default(0),
  avgScore: real('avg_score').notNull().default(0),
  avgHintLevel: real('avg_hint_level').notNull().default(0),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ── Dojo tables ──────────────────────────────────────────────────────────────

export const userGamification = pgTable('user_gamification', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  streakWeeks: integer('streak_weeks').notNull().default(0),
  lastActiveWeek: date('last_active_week'),
  currentWeekXp: integer('current_week_xp').notNull().default(0),
  weekStart: date('week_start'),
  totalXp: integer('total_xp').notNull().default(0),
  weeklyGoal: integer('weekly_goal').notNull().default(50),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const dojoTips = pgTable('dojo_tips', {
  id: uuid('id').primaryKey().defaultRandom(),
  category: text('category').notNull(),
  key: text('key').notNull(),
  mode: text('mode').notNull().default('ALL'),
  title: text('title').notNull(),
  body: text('body').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const dojoProgress = pgTable(
  'dojo_progress',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    category: text('category').notNull(),
    key: text('key').notNull(),
    status: text('status').notNull().default('LOCKED'),
    level: integer('level').notNull().default(1),
    xp: integer('xp').notNull().default(0),
    attemptsCount: integer('attempts_count').notNull().default(0),
    avgScore: real('avg_score').notNull().default(0),
    bestScore: real('best_score').notNull().default(0),
    guidedUnlockedAt: timestamp('guided_unlocked_at'),
    strictUnlockedAt: timestamp('strict_unlocked_at'),
    masteredAt: timestamp('mastered_at'),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({ uniqueUserCategoryKey: unique().on(t.userId, t.category, t.key) }),
);

export const dojodrills = pgTable('dojo_drills', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull(),
  pattern: text('pattern'),
  prompt: text('prompt').notNull(),
  correctAnswer: text('correct_answer'),
  difficulty: text('difficulty').notNull().default('EASY'),
});

// ── Programs tables ──────────────────────────────────────────────────────────

export const userPrograms = pgTable('user_programs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'DAILY_SPRINT' | 'DEEP_DIVE' | 'INTERVIEW_SIM'
  config: jsonb('config').notNull().default('{}'), // { pattern?: string }
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const programAssignments = pgTable('program_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  programId: uuid('program_id')
    .notNull()
    .references(() => userPrograms.id, { onDelete: 'cascade' }),
  problemId: uuid('problem_id')
    .notNull()
    .references(() => problems.id),
  assignedDate: text('assigned_date').notNull(), // 'YYYY-MM-DD'
  sessionId: uuid('session_id').references(() => sessions.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const dojoAttempts = pgTable('dojo_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  drillId: uuid('drill_id')
    .notNull()
    .references(() => dojodrills.id),
  answer: text('answer').notNull(),
  score: integer('score').notNull(),
  aiFeedback: text('ai_feedback').notNull(),
  attemptedAt: timestamp('attempted_at').notNull().defaultNow(),
});
