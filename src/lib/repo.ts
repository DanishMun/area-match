// Data access. Reads cities from the database, or from the built-in seed data if there is no database.

import { SEED_CITIES } from "@/data/seed";
import { sql } from "./db";
import type { Area, City, CityId, Destination, TransitLine } from "./types";

export type DataSource = "database" | "built-in";

export async function getCity(id: CityId): Promise<{ city: City; source: DataSource } | null> {
  if (sql) {
    try {
      const [meta] = await sql<{ id: CityId; title: string }[]>`select id, title from cities where id = ${id}`;
      if (meta) {
        const areas = await sql<Area[]>`
          select id, city_id as "cityId", name, town, lat, lon, eur_m2::float as "eurM2", mode, traits, blurb
          from areas where city_id = ${id} order by name`;
        const destinations = await sql<Destination[]>`
          select id, name, lat, lon, fast from destinations where city_id = ${id} order by sort_order`;
        const lines = await sql<TransitLine[]>`
          select kind, name, points from transit_lines where city_id = ${id} order by id`;
        return {
          city: { ...meta, areas: [...areas], destinations: [...destinations], lines: lines.map((l) => ({ ...l, name: l.name ?? undefined })) },
          source: "database",
        };
      }
    } catch (err) {
      console.error("Database read failed, using built-in data:", err);
    }
  }
  const city = SEED_CITIES.find((c) => c.id === id);
  return city ? { city, source: "built-in" } : null;
}

// ---- Travel time cache ----
// Real journey planner answers are saved so we don't ask again for the same trip.

const memoryCache = new Map<string, number>();

export async function getCachedMinutes(key: string): Promise<number | undefined> {
  if (memoryCache.has(key)) return memoryCache.get(key);
  if (!sql) return undefined;
  try {
    const [row] = await sql<{ minutes: number }[]>`
      select minutes from travel_cache where key = ${key} and created_at > now() - interval '30 days'`;
    if (row) memoryCache.set(key, row.minutes);
    return row?.minutes;
  } catch {
    return undefined;
  }
}

export async function setCachedMinutes(key: string, minutes: number): Promise<void> {
  memoryCache.set(key, minutes);
  if (!sql) return;
  try {
    await sql`
      insert into travel_cache (key, minutes) values (${key}, ${minutes})
      on conflict (key) do update set minutes = excluded.minutes, created_at = now()`;
  } catch {
    // Cache is a nice-to-have. Ignore errors.
  }
}
