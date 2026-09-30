// Checks that requests to our API contain sensible values.

import { z } from "zod";

export const TRAIT_KEYS = ["quiet", "nightlife", "nature", "water", "family", "international", "shops","gym"] as const;

export const matchRequestSchema = z.object({
  city: z.enum(["hel", "tre"]),
  destination: z.object({
    name: z.string().min(1).max(120),
    lat: z.number().min(59).max(62.5),
    lon: z.number().min(21).max(26.5),
    fast: z.boolean(),
  }),
  size: z.enum(["studio", "one", "two"]),
  budget: z.number().int().min(300).max(5000),
  maxCommute: z.number().int().min(5).max(120),
  traits: z.array(z.enum(TRAIT_KEYS)).max(3),
});
