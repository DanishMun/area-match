// Database connection (PostgreSQL on Supabase).
// If DATABASE_URL is not set, `sql` is null and the app uses the built-in seed data instead.

import postgres from "postgres";

declare global {
  // Keep one connection pool during local development hot reloads.
  var __sql: ReturnType<typeof postgres> | undefined;
}

function create() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return postgres(url, {
    // Supabase's "Transaction pooler" does not support prepared statements.
    prepare: false,
    max: 5,
    idle_timeout: 20,
    ssl: url.includes("localhost") ? false : "require",
  });
}

export const sql = globalThis.__sql ?? create();
if (process.env.NODE_ENV !== "production" && sql) globalThis.__sql = sql;
