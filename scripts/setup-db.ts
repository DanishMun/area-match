// Creates the tables and fills them with the built-in data.
// Run with: npm run db:setup   (needs DATABASE_URL in .env.local)

import { config } from "dotenv";
import { readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { SEED_CITIES } from "../src/data/seed";

config({ path: [".env.local", ".env"], quiet: true });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is missing. Copy .env.example to .env.local and paste your Supabase connection string.");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, ssl: url.includes("localhost") ? false : "require", max: 1 });

async function main() {
  console.log("Creating tables...");
  await sql.unsafe(readFileSync(path.join(__dirname, "../supabase/schema.sql"), "utf8"));

  for (const city of SEED_CITIES) {
    console.log(`Saving ${city.title}: ${city.areas.length} areas, ${city.destinations.length} destinations`);
    await sql.begin(async (tx) => {
      await tx`insert into cities (id, title) values (${city.id}, ${city.title})
               on conflict (id) do update set title = excluded.title`;

      for (const a of city.areas) {
        await tx`insert into areas (id, city_id, name, town, lat, lon, eur_m2, mode, traits, blurb)
          values (${a.id}, ${city.id}, ${a.name}, ${a.town}, ${a.lat}, ${a.lon}, ${a.eurM2}, ${a.mode}, ${tx.json(a.traits)}, ${a.blurb})
          on conflict (id) do update set name = excluded.name, town = excluded.town, lat = excluded.lat, lon = excluded.lon,
            eur_m2 = excluded.eur_m2, mode = excluded.mode, traits = excluded.traits, blurb = excluded.blurb, updated_at = now()`;
      }

      for (const [i, d] of city.destinations.entries()) {
        await tx`insert into destinations (id, city_id, name, lat, lon, fast, sort_order)
          values (${d.id}, ${city.id}, ${d.name}, ${d.lat}, ${d.lon}, ${d.fast}, ${i})
          on conflict (id) do update set name = excluded.name, lat = excluded.lat, lon = excluded.lon, fast = excluded.fast, sort_order = excluded.sort_order`;
      }

      await tx`delete from transit_lines where city_id = ${city.id}`;
      for (const l of city.lines) {
        await tx`insert into transit_lines (city_id, kind, name, points) values (${city.id}, ${l.kind}, ${l.name ?? null}, ${tx.json(l.points)})`;
      }
    });
  }
  console.log("Done! Your database is ready.");
}

main()
  .catch((err) => {
    console.error("Setup failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
