/** Supabase/Postgres — Prisma `User.passwordHash` ↔ `password_hash` */
export const USERS_PASSWORD_HASH_SQL =
  'ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" TEXT;';
