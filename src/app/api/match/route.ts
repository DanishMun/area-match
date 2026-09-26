// POST /api/match  -> every area in the city, scored and sorted best first
import { NextResponse } from "next/server";
import { getCity } from "@/lib/repo";
import { rankAreas } from "@/lib/scoring";
import { hasLiveTravel, travelForAreas } from "@/lib/transit";
import type { MatchRequest, MatchResponse } from "@/lib/types";
import { matchRequestSchema } from "@/lib/validation";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send the request body as JSON." }, { status: 400 });
  }

  const parsed = matchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Some values are missing or wrong.", details: parsed.error.issues }, { status: 400 });
  }
  const input: MatchRequest = parsed.data;

  const found = await getCity(input.city);
  if (!found) return NextResponse.json({ error: "City not found." }, { status: 404 });

  const travel = await travelForAreas(input.city, found.city.areas, input.destination);
  const results = rankAreas(found.city.areas, input, (a) => travel.get(a.id)!);

  const response: MatchResponse = {
    destination: input.destination,
    results,
    liveTravel: hasLiveTravel() && results.some((r) => r.travel.source === "live"),
    dataSource: found.source,
  };
  return NextResponse.json(response);
}
