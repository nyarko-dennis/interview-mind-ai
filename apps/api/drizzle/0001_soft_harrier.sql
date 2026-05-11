CREATE TABLE IF NOT EXISTS "dojo_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"drill_id" uuid NOT NULL,
	"answer" text NOT NULL,
	"score" integer NOT NULL,
	"ai_feedback" text NOT NULL,
	"attempted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dojo_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category" text NOT NULL,
	"key" text NOT NULL,
	"status" text DEFAULT 'LOCKED' NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"attempts_count" integer DEFAULT 0 NOT NULL,
	"avg_score" real DEFAULT 0 NOT NULL,
	"best_score" real DEFAULT 0 NOT NULL,
	"guided_unlocked_at" timestamp,
	"strict_unlocked_at" timestamp,
	"mastered_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dojo_progress_user_id_category_key_unique" UNIQUE("user_id","category","key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dojo_tips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text NOT NULL,
	"key" text NOT NULL,
	"mode" text DEFAULT 'ALL' NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dojo_drills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"pattern" text,
	"prompt" text NOT NULL,
	"correct_answer" text,
	"difficulty" text DEFAULT 'EASY' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_gamification" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"streak_weeks" integer DEFAULT 0 NOT NULL,
	"last_active_week" date,
	"current_week_xp" integer DEFAULT 0 NOT NULL,
	"week_start" date,
	"total_xp" integer DEFAULT 0 NOT NULL,
	"weekly_goal" integer DEFAULT 50 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_gamification_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "preferred_mode" SET DEFAULT 'GUIDED';--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "free_play" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dojo_attempts" ADD CONSTRAINT "dojo_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dojo_attempts" ADD CONSTRAINT "dojo_attempts_drill_id_dojo_drills_id_fk" FOREIGN KEY ("drill_id") REFERENCES "public"."dojo_drills"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dojo_progress" ADD CONSTRAINT "dojo_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_gamification" ADD CONSTRAINT "user_gamification_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
