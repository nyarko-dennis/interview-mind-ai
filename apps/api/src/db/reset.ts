/**
 * Full reset helper — run before a fresh start.
 *
 * Usage:
 *   RESET_USER_EMAIL=you@example.com pnpm --filter @interview-mind/api db:reset
 *
 * What it does (in order):
 *   1. Applies any schema changes that live outside drizzle-kit's journal
 *      (uses ADD COLUMN IF NOT EXISTS so it's safe to run multiple times)
 *   2. Deletes the user row for RESET_USER_EMAIL, which cascades to
 *      sessions → scores → submissions → pattern_progress
 *
 * After this script, run:
 *   pnpm --filter @interview-mind/api db:seed        (problems + hints)
 *   pnpm --filter @interview-mind/api db:seed-tests  (function stubs + test runners)
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as schema from './schema';

const { users } = schema;

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

async function applyPendingSchemaChanges() {
  // 0001 — function_stub and test_runner on problems
  await client.unsafe(`
    ALTER TABLE problems
      ADD COLUMN IF NOT EXISTS function_stub text,
      ADD COLUMN IF NOT EXISTS test_runner   text
  `);

  // 0002 — clarification_attempts on sessions
  await client.unsafe(`
    ALTER TABLE sessions
      ADD COLUMN IF NOT EXISTS clarification_attempts integer NOT NULL DEFAULT 0
  `);

  console.log('  ✓  schema up to date');
}

async function deleteUser(email: string) {
  const deleted = await db
    .delete(users)
    .where(eq(users.email, email))
    .returning({ email: users.email });

  if (deleted.length) {
    console.log(`  ✓  deleted user ${email} (sessions, scores, and progress cascaded)`);
  } else {
    console.log(`  –  no user found for ${email} — nothing to delete`);
  }
}

async function main() {
  console.log('── db:reset ──────────────────────────────');

  console.log('\n[1/2] applying pending schema changes…');
  await applyPendingSchemaChanges();

  const email = process.env.RESET_USER_EMAIL;
  console.log('\n[2/2] clearing user data…');
  if (email) {
    await deleteUser(email);
  } else {
    console.log('  –  RESET_USER_EMAIL not set — skipping user deletion');
  }

  console.log('\n─────────────────────────────────────────');
  console.log('Next steps:');
  console.log('  pnpm --filter @interview-mind/api db:seed');
  console.log('  pnpm --filter @interview-mind/api db:seed-tests');
  console.log('─────────────────────────────────────────\n');

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
