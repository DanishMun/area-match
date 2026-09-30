import { describe, expect, it } from "vitest";
import { SEED_CITIES } from "@/data/seed";
import { commuteScore, distanceKm, estimateTravel, lifestyleScore, rankAreas, rentRange, rentScore } from "@/lib/scoring";
import type { MatchRequest } from "@/lib/types";

const hel = SEED_CITIES.find((c) => c.id === "hel")!;
const aalto = hel.destinations.find((d) => d.name.startsWith("Aalto"))!;

describe("distanceKm", () => {
  it("is about 6 km from Kamppi to Otaniemi", () => {
    const kamppi = hel.areas.find((a) => a.name === "Kamppi")!;
    expect(distanceKm(kamppi.lat, kamppi.lon, aalto.lat, aalto.lon)).toBeCloseTo(5.9, 0);
  });
});

describe("rent", () => {
  it("adds 10–30% for a furnished home", () => {
    const r = rentRange({ eurM2: 20 }, "studio"); // 20 €/m² × 28 m² = 560
    expect(r.low).toBe(620);
    expect(r.high).toBe(730);
  });
  it("gives full points in budget and zero at 30% over", () => {
    expect(rentScore(900, 1000)).toBe(1);
    expect(rentScore(1300, 1000)).toBe(0);
  });
});

describe("commute", () => {
  it("prefers shorter trips and drops to zero at 1.5x the limit", () => {
    expect(commuteScore(10, 30)).toBeGreaterThan(commuteScore(25, 30));
    expect(commuteScore(45, 30)).toBe(0);
  });
  it("ranks an area just over the limit well below one inside it", () => {
    expect(commuteScore(32, 30)).toBeLessThan(commuteScore(30, 30) - 0.05);
  });
  it("walks when the destination is very close", () => {
    const t = estimateTravel({ lat: 60.186, lon: 24.828, mode: "M" }, aalto);
    expect(t.how).toBe("walk");
  });
});

describe("lifestyle", () => {
  it("returns null when nothing is picked", () => {
    expect(lifestyleScore(hel.areas[0], [])).toBeNull();
  });
});

describe("rankAreas", () => {
  it("ranks Otaniemi first for an Aalto student who likes nature and an international crowd", () => {
    const req: MatchRequest = {
      city: "hel",
      destination: aalto,
      size: "studio",
      budget: 950,
      maxCommute: 30,
      traits: ["nature", "international"],
    };
    const ranked = rankAreas(hel.areas, req, (a) => estimateTravel(a, aalto));
    expect(ranked[0].area.name).toBe("Otaniemi");
    expect(ranked).toHaveLength(hel.areas.length);
    // Only 'nature' picked: a greener area over the commute limit must not beat the campus itself.
    const natureOnly = rankAreas(hel.areas, { ...req, traits: ["nature"] }, (a) => estimateTravel(a, aalto));
    expect(natureOnly[0].area.name).toBe("Otaniemi");
    for (let i = 1; i < ranked.length; i++) expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score);
  });
});

describe("gym trait", () => {
  it("every area has a gym rating from 1 to 5", () => {
    for (const city of SEED_CITIES) {
      for (const area of city.areas) {
        expect(area.traits.gym).toBeGreaterThanOrEqual(1);
        expect(area.traits.gym).toBeLessThanOrEqual(5);
      }
    }
  });

  it("Kamppi gets full lifestyle points for gym", () => {
    const kamppi = hel.areas.find((a) => a.name === "Kamppi")!;
    expect(lifestyleScore(kamppi, ["gym"])).toBe(1);
  });
});