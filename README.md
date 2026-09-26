# Area Match

**Find the best neighbourhood for your furnished rental in Finland.**

People moving to Finland for study or work often don't know the city. Rental sites show homes in places like Kallio, Tapiola or Hervanta, but newcomers can't tell which area suits them. Area Match asks four questions (where you study or work, home size, budget, what you like) and ranks every area by **rent**, **commute** and **lifestyle**.

Built as a concept for [Flatta](https://flatta.fi), the Nordic marketplace for furnished rentals.

## Features

- Ranks 28 areas in Helsinki, Espoo and Vantaa, and 8 in Tampere, with a 0–100 match score
- Real street map with metro, train and tram lines (MapLibre + OpenStreetMap)
- Click anywhere on the map to rank areas by distance to your own place
- Real morning travel times from the HSL / Nysse journey planner (Digitransit API), cached in the database
- Works without any setup: falls back to built-in data and estimated travel times
- "Copy my shortlist" to share your top 5 areas
- Mobile friendly, dark mode

## Tech stack

| Part | Tool |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Map | MapLibre GL, OpenFreeMap tiles |
| Backend API | Next.js route handlers (`/api/cities/[city]`, `/api/match`) |
| Validation | Zod |
| Database | PostgreSQL on Supabase (`postgres` driver) |
| Live travel times | Digitransit GraphQL API (HSL, Waltti) |
| Tests | Vitest |
| Hosting | Vercel |

## How it works

```
Browser (React)
   │  POST /api/match  { destination, size, budget, maxCommute, traits }
   ▼
Next.js API route ──► Supabase Postgres (areas, destinations, transit lines, travel-time cache)
   │
   └──────────────► Digitransit API (real travel times, only when not cached yet)
   ▼
Scored and sorted list of areas ──► map markers + result cards
```

**Match score (0–100)** = rent 35% + commute 35% + lifestyle 30%. See `src/lib/scoring.ts`.

## Project structure

```
src/
  app/
    page.tsx                  Home page
    api/match/route.ts        POST: score and rank areas
    api/cities/[city]/route.ts GET: areas, destinations, transit lines
  components/                 React UI (AreaMatch, MapView, ResultCard)
  lib/
    scoring.ts                The scoring logic (pure functions, tested)
    transit.ts                Digitransit journey planner + fallback estimate
    repo.ts                   Reads from the database, or from built-in data
    db.ts                     Database connection
  data/seed.ts                Built-in areas, destinations and lines
supabase/schema.sql           Database tables
scripts/setup-db.ts           Creates tables and loads the data
tests/scoring.test.ts         Unit tests
```

## Run it on your computer

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000. It works right away with built-in data.

### Optional: connect the database and live travel times

1. Copy `.env.example` to `.env.local`.
2. **Supabase:** Project Settings → Database → Connection string → **Transaction pooler**. Paste it as `DATABASE_URL` (replace `[YOUR-PASSWORD]` with your database password).
3. **Digitransit:** get a free key at https://portal-api.digitransit.fi and paste it as `DIGITRANSIT_API_KEY`.
4. Create the tables and load the data:

   ```bash
   npm run db:setup
   ```

5. Restart `npm run dev`. The labels above the results now say "Live travel times" and "Data from database".

## Other commands

```bash
npm test         # run the unit tests
npm run lint     # type-check the code
npm run build    # production build
```

## Deploy to Vercel

1. Push this project to GitHub.
2. On vercel.com: **Add New → Project → Import** your repository.
3. Under **Environment Variables**, add `DATABASE_URL` and `DIGITRANSIT_API_KEY`.
4. Click **Deploy**. Every push to GitHub deploys a new version.

## Ideas for next steps

- Pull real rents per postal code from Statistics Finland's open data (PxWeb API)
- Show live Flatta listings for each area (needs Flatta's API)
- Add Turku, Stockholm and Copenhagen
- Let users save and share shortlists

## Data notes

Rent levels are estimates based on Flatta's 2026 rent guide and public market data. Lifestyle ratings are our own judgement. This is an unofficial concept, not a Flatta product.
