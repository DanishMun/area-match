// GET /api/cities/hel  -> areas, destinations and transit lines for one city
import { NextResponse } from "next/server";
import { getCity } from "@/lib/repo";
import type { CityId } from "@/lib/types";

export async function GET(_req: Request, ctx: { params: Promise<{ city: string }> }) {
  const { city: id } = await ctx.params;
  if (id !== "hel" && id !== "tre") return NextResponse.json({ error: "Unknown city. Use 'hel' or 'tre'." }, { status: 404 });
  const found = await getCity(id as CityId);
  if (!found) return NextResponse.json({ error: "City not found." }, { status: 404 });
  return NextResponse.json({ ...found.city, dataSource: found.source }, { headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400" } });
}
