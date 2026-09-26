// The "brain" of the app: pure functions with no network or database.
// Pure functions are easy to test (see tests/scoring.test.ts).

import type { Area, MatchRequest, MatchResult, Mode, SizeKey, Travel } from "./types";

export const SIZES: Record<SizeKey, { label: string; m2: number }> = {
  studio: { label: "Studio", m2: 28 },
  one: { label: "1 bedroom", m2: 42 },
  two: { label: "2 bedrooms", m2: 58 },
};

/** Furnished, flexible homes usually cost 10–30% more than normal unfurnished rentals. */
export const FURNISHED_LOW = 1.1;
export const FURNISHED_HIGH = 1.3;

/** Score weights. They add up to 1. */
export const WEIGHTS = { rent: 0.35, commute: 0.35, lifestyle: 0.3 };

const MODE_NAME: Record<Mode, Travel["how"]> = { M: "metro", T: "train", R: "tram", B: "bus" };

/** Distance between two points on Earth in kilometres (haversine formula). */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Our own travel time guess, used when the live journey planner is not available.
 * Metro and trains are faster per km than trams, and trams are faster than buses.
 */
export function estimateTravel(area: Pick<Area, "lat" | "lon" | "mode">, dest: { lat: number; lon: number; fast: boolean }): Travel {
  const d = distanceKm(area.lat, area.lon, dest.lat, dest.lon);
  const walk = Math.max(5, d * 12);
  const bikeMinutes = Math.round(Math.max(5, d * 4));
  const railToRail = (area.mode === "M" || area.mode === "T") && dest.fast;
  const minPerKm = railToRail ? 2.1 : area.mode === "R" ? 2.8 : 3.2;
  const transit = 8 + d * minPerKm;
  if (walk < transit) return { minutes: Math.round(walk), bikeMinutes, how: "walk", source: "estimate" };
  return { minutes: Math.round(transit), bikeMinutes, how: MODE_NAME[area.mode], source: "estimate" };
}

export function rentRange(area: Pick<Area, "eurM2">, size: SizeKey) {
  const base = area.eurM2 * SIZES[size].m2;
  const round10 = (n: number) => Math.round(n / 10) * 10;
  return { low: round10(base * FURNISHED_LOW), high: round10(base * FURNISHED_HIGH), mid: base * ((FURNISHED_LOW + FURNISHED_HIGH) / 2) };
}

/** 1 when the rent fits the budget, falling to 0 when it is 30% over. */
export function rentScore(mid: number, budget: number): number {
  const ratio = mid / budget;
  if (ratio <= 1) return 1;
  return Math.max(0, 1 - (ratio - 1) / 0.3);
}

/**
 * Close to 1 for short trips, 0.6 at your limit, then falls fast to 0 at 1.5x the limit.
 * Shorter trips clearly win, and areas over your limit drop down the list.
 */
export function commuteScore(minutes: number, max: number): number {
  if (minutes <= max) return 1 - 0.4 * (minutes / max);
  return Math.max(0, 0.6 * (1 - (minutes - max) / (max * 0.5)));
}

/** Average of the chosen traits, turned from 1–5 into 0–1. Null if none chosen. */
export function lifestyleScore(area: Pick<Area, "traits">, traits: MatchRequest["traits"]): number | null {
  if (traits.length === 0) return null;
  return traits.reduce((sum, k) => sum + (area.traits[k] - 1) / 4, 0) / traits.length;
}

export function scoreArea(area: Area, req: MatchRequest, travel: Travel): MatchResult {
  const rent = rentRange(area, req.size);
  const r = rentScore(rent.mid, req.budget);
  const c = commuteScore(travel.minutes, req.maxCommute);
  const l = lifestyleScore(area, req.traits);

  // If no lifestyle traits are picked, rent and commute share the weight equally.
  const w = l === null ? { rent: 0.5, commute: 0.5, lifestyle: 0 } : WEIGHTS;
  const parts = { rent: r * w.rent, commute: c * w.commute, lifestyle: (l ?? 0) * w.lifestyle };

  const ratio = rent.mid / req.budget;
  return {
    area,
    score: Math.round(100 * (parts.rent + parts.commute + parts.lifestyle)),
    parts,
    rent,
    budgetStatus: ratio <= 1 ? "ok" : ratio <= 1.12 ? "near" : "over",
    commuteStatus: travel.minutes <= req.maxCommute ? "ok" : travel.minutes <= req.maxCommute * 1.3 ? "near" : "over",
    travel,
  };
}

export function rankAreas(areas: Area[], req: MatchRequest, travelFor: (a: Area) => Travel): MatchResult[] {
  return areas.map((a) => scoreArea(a, req, travelFor(a))).sort((x, y) => y.score - x.score);
}
