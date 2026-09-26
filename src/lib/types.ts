// Shared types used by both the backend (API routes) and the frontend (React).

export type CityId = "hel" | "tre";

/** How you get around from an area: Metro, Train, tRam (tram / light rail) or Bus. */
export type Mode = "M" | "T" | "R" | "B";

/** Lifestyle traits. Each area has a 1–5 rating for each one. */
export type TraitKey = "quiet" | "nightlife" | "nature" | "water" | "family" | "international" | "shops";

export type Traits = Record<TraitKey, number>;

export interface Area {
  id: string;
  cityId: CityId;
  name: string;
  town: string;
  lat: number;
  lon: number;
  /** Estimated average unfurnished rent in euros per square metre per month. */
  eurM2: number;
  mode: Mode;
  traits: Traits;
  blurb: string;
}

export interface Destination {
  id: string;
  name: string;
  lat: number;
  lon: number;
  /** True if the place is next to a metro or train station. */
  fast: boolean;
}

export interface TransitLine {
  kind: "metro" | "train" | "tram";
  name?: string;
  /** [lat, lon] pairs */
  points: [number, number][];
}

export interface City {
  id: CityId;
  title: string;
  areas: Area[];
  destinations: Destination[];
  lines: TransitLine[];
}

export type SizeKey = "studio" | "one" | "two";

export interface MatchRequest {
  city: CityId;
  destination: { name: string; lat: number; lon: number; fast: boolean };
  size: SizeKey;
  budget: number;
  maxCommute: number;
  traits: TraitKey[];
}

export interface Travel {
  minutes: number;
  bikeMinutes: number;
  how: "walk" | "metro" | "train" | "tram" | "bus" | "public transport";
  /** "live" = real journey planner result, "estimate" = our own distance-based guess. */
  source: "live" | "estimate";
}

export interface MatchResult {
  area: Area;
  score: number;
  parts: { rent: number; commute: number; lifestyle: number };
  rent: { low: number; high: number; mid: number };
  budgetStatus: "ok" | "near" | "over";
  commuteStatus: "ok" | "near" | "over";
  travel: Travel;
}

export interface MatchResponse {
  destination: MatchRequest["destination"];
  results: MatchResult[];
  liveTravel: boolean;
  dataSource: "database" | "built-in";
}
