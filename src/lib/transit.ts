// Real travel times from Digitransit, the open journey planner behind HSL (Helsinki) and Nysse (Tampere).
// Docs: https://digitransit.fi/en/developers/apis/1-routing-api/
// If there is no API key, or a request fails, we fall back to our own estimate. The app never breaks.

import { estimateTravel } from "./scoring";
import { getCachedMinutes, setCachedMinutes } from "./repo";
import type { Area, CityId, Travel } from "./types";

const ENDPOINT: Record<CityId, string> = {
  hel: "https://api.digitransit.fi/routing/v2/hsl/gtfs/v1",
  tre: "https://api.digitransit.fi/routing/v2/waltti/gtfs/v1",
};

const QUERY = `
query Trip($fromLat: CoordinateValue!, $fromLon: CoordinateValue!, $toLat: CoordinateValue!, $toLon: CoordinateValue!, $time: OffsetDateTime!) {
  planConnection(
    origin: { location: { coordinate: { latitude: $fromLat, longitude: $fromLon } } }
    destination: { location: { coordinate: { latitude: $toLat, longitude: $toLon } } }
    dateTime: { earliestDeparture: $time }
    first: 3
  ) {
    edges { node { duration } }
  }
}`;

export const hasLiveTravel = () => Boolean(process.env.DIGITRANSIT_API_KEY);

/** Next weekday at 08:30 Finnish time: a normal morning commute. */
export function nextMorningCommute(now = new Date()): string {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  const ymd = d.toISOString().slice(0, 10);
  // Finland is UTC+3 in summer and UTC+2 in winter. +03:00 is close enough for a planning estimate.
  return `${ymd}T08:30:00+03:00`;
}

async function fetchMinutes(city: CityId, from: { lat: number; lon: number }, to: { lat: number; lon: number }): Promise<number | null> {
  const key = process.env.DIGITRANSIT_API_KEY;
  if (!key) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(ENDPOINT[city], {
      method: "POST",
      headers: { "Content-Type": "application/json", "digitransit-subscription-key": key },
      body: JSON.stringify({
        query: QUERY,
        variables: { fromLat: from.lat, fromLon: from.lon, toLat: to.lat, toLon: to.lon, time: nextMorningCommute() },
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = await res.json();
    const durations: number[] = (json?.data?.planConnection?.edges ?? [])
      .map((e: { node?: { duration?: number } }) => e?.node?.duration)
      .filter((n: unknown): n is number => typeof n === "number");
    if (durations.length === 0) return null;
    return Math.round(Math.min(...durations) / 60);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const round = (n: number) => n.toFixed(3); // ~100 m grid, so nearby pins share cache entries

/** Travel time for every area, using live data where possible. Runs a few requests at a time. */
export async function travelForAreas(city: CityId, areas: Area[], dest: { lat: number; lon: number; fast: boolean }): Promise<Map<string, Travel>> {
  const out = new Map<string, Travel>();
  const live = hasLiveTravel();
  const queue = [...areas];

  async function worker() {
    while (queue.length) {
      const area = queue.shift()!;
      const estimate = estimateTravel(area, dest);
      if (!live || estimate.how === "walk") {
        out.set(area.id, estimate);
        continue;
      }
      const key = `${city}|${round(area.lat)},${round(area.lon)}|${round(dest.lat)},${round(dest.lon)}`;
      let minutes = await getCachedMinutes(key);
      if (minutes === undefined) {
        const fetched = await fetchMinutes(city, area, dest);
        if (fetched !== null) {
          minutes = fetched;
          await setCachedMinutes(key, fetched);
        }
      }
      out.set(area.id, minutes === undefined ? estimate : { ...estimate, minutes, how: "public transport", source: "live" });
    }
  }

  await Promise.all(Array.from({ length: 6 }, worker));
  return out;
}
