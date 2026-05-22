ALTER TABLE "problems" ADD COLUMN "function_stubs" jsonb DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "problems" ADD COLUMN "test_runners" jsonb DEFAULT '{}' NOT NULL;