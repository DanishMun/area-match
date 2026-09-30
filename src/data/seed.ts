// Built-in starting data.
// - Used to fill the database the first time (npm run db:setup).
// - Also used directly when no database is connected, so the app always works.
//
// Rent levels (eurM2) are estimates based on Flatta's 2026 rent guide and public market data.
// Lifestyle ratings (1–5) are our own judgement.

import type { Area, City, CityId, Destination, Mode, TraitKey, TransitLine } from "@/lib/types";

const TRAIT_ORDER: TraitKey[] = ["quiet", "nightlife", "nature", "water", "family", "international", "shops", "gym"];

type Row = [name: string, town: string, lat: number, lon: number, eurM2: number, mode: Mode, traits: number[], blurb: string];

const slug = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function toAreas(cityId: CityId, rows: Row[]): Area[] {
  return rows.map(([name, town, lat, lon, eurM2, mode, t, blurb]) => ({
    id: `${cityId}-${slug(name)}`,
    cityId,
    name,
    town,
    lat,
    lon,
    eurM2,
    mode,
    traits: Object.fromEntries(TRAIT_ORDER.map((k, i) => [k, t[i]])) as Area["traits"],
    blurb,
  }));
}

function toDests(cityId: CityId, rows: [string, number, number, boolean][]): Destination[] {
  return rows.map(([name, lat, lon, fast]) => ({ id: `${cityId}-${slug(name)}`, name, lat, lon, fast }));
}

//               name                 town        lat      lon     €/m² mode  q n g w f i s
const HEL: Row[] = [
  ["Kamppi", "Helsinki", 60.1685, 24.931, 26, "M", [1, 5, 1, 2, 2, 5, 5, 5], "The very centre. Shopping centre, metro and all buses at your door. Busy and loud."],
  ["Punavuori", "Helsinki", 60.1605, 24.94, 26, "R", [2, 4, 2, 3, 2, 5, 4, 5], "The Design District. Cafés, small shops and old stone buildings."],
  ["Eira & Ullanlinna", "Helsinki", 60.159, 24.948, 28, "R", [4, 2, 3, 5, 4, 4, 3, 5], "Quiet streets by the sea and Kaivopuisto park. The priciest part of town."],
  ["Töölö", "Helsinki", 60.181, 24.923, 24, "R", [4, 3, 4, 3, 4, 4, 4, 5], "Classic apartment blocks close to Töölönlahti bay and Sibelius park."],
  ["Kallio", "Helsinki", 60.184, 24.95, 23, "M", [1, 5, 2, 2, 2, 4, 4, 5], "Bars, cheap food and a young crowd. Lively day and night."],
  ["Sörnäinen", "Helsinki", 60.187, 24.961, 22, "M", [2, 4, 2, 3, 2, 3, 4, 5], "Next to Kallio, a bit cheaper. Metro stop and the seaside at Hanasaari."],
  ["Kalasatama", "Helsinki", 60.1875, 24.978, 23, "M", [3, 3, 2, 4, 3, 4, 5, 5], "New towers and the Redi mall. Modern flats right on the metro."],
  ["Arabianranta", "Helsinki", 60.208, 24.979, 20, "R", [4, 2, 4, 4, 4, 3, 3, 5], "Calm seaside area with a design school feel. Trams to the centre."],
  ["Pasila", "Helsinki", 60.199, 24.933, 21, "T", [3, 2, 3, 1, 3, 3, 5, 5], "The big rail hub and Tripla mall. Fast trains in every direction."],
  ["Lauttasaari", "Helsinki", 60.159, 24.877, 23, "M", [4, 2, 4, 5, 5, 4, 3, 5], "An island with beaches and its own metro stop. Popular with families."],
  ["Jätkäsaari", "Helsinki", 60.158, 24.92, 24, "R", [3, 2, 2, 5, 4, 4, 3, 5], "New harbour district. Seaside walks and ferries to Tallinn."],
  ["Munkkiniemi", "Helsinki", 60.198, 24.877, 22, "R", [5, 1, 4, 4, 5, 3, 3, 5], "Leafy and very quiet, close to Seurasaari island. Trams to town."],
  ["Herttoniemi", "Helsinki", 60.195, 25.03, 20, "M", [4, 2, 5, 3, 4, 3, 4, 5], "Green area on the metro line with forest trails and a seaside park."],
  ["Kumpula", "Helsinki", 60.205, 24.962, 20, "R", [4, 2, 4, 1, 4, 3, 2, 5], "Old wooden houses, garden plots and a science campus."],
  ["Viikki", "Helsinki", 60.226, 25.015, 18, "B", [5, 1, 5, 2, 4, 3, 3, 5], "A nature reserve and campus life. Quiet, lots of students."],
  ["Vuosaari", "Helsinki", 60.209, 25.144, 17, "M", [4, 2, 5, 5, 4, 3, 4, 5], "End of the metro line. Beaches, forest and lower rents."],
  ["Malmi", "Helsinki", 60.251, 25.011, 17, "T", [3, 1, 3, 1, 3, 3, 4, 5], "Local centre with a train station. Good value for money."],
  ["Kontula", "Helsinki", 60.236, 25.082, 16, "M", [3, 2, 3, 1, 3, 4, 3, 4], "Some of the lowest rents on the metro. A mixed, international area."],
  ["Myllypuro", "Helsinki", 60.224, 25.077, 17, "M", [4, 1, 4, 1, 4, 3, 2, 3], "Metropolia campus and forests. Quiet and affordable."],
  ["Otaniemi", "Espoo", 60.186, 24.828, 25, "M", [4, 2, 4, 4, 2, 5, 2, 5], "Aalto University campus. Student life, very international, metro to town."],
  ["Tapiola", "Espoo", 60.176, 24.805, 23, "M", [4, 2, 4, 3, 5, 4, 5, 3], "Garden city with a big mall and a cultural centre."],
  ["Leppävaara", "Espoo", 60.219, 24.813, 19, "T", [3, 2, 3, 1, 4, 3, 5, 5], "Sello mall and fast trains to Helsinki."],
  ["Matinkylä", "Espoo", 60.159, 24.739, 19, "M", [3, 2, 3, 4, 4, 3, 5, 5], "Iso Omena mall on the metro, close to the sea."],
  ["Espoonlahti", "Espoo", 60.148, 24.656, 16, "M", [4, 1, 4, 4, 4, 3, 4, 5], "New metro end station by the sea. Lower rents than central Espoo."],
  ["Espoon keskus", "Espoo", 60.205, 24.656, 16, "T", [3, 1, 4, 1, 4, 3, 3, 4], "Espoo's city hall area with trains to Helsinki."],
  ["Tikkurila", "Vantaa", 60.292, 25.044, 19, "T", [3, 2, 3, 1, 4, 3, 4, 5], "Vantaa's centre. The train reaches the airport in about 8 minutes."],
  ["Myyrmäki", "Vantaa", 60.261, 24.854, 17, "T", [3, 2, 3, 1, 3, 4, 4, 5], "Busy local centre with a Metropolia campus and ring rail trains."],
  ["Aviapolis", "Vantaa", 60.297, 24.963, 20, "T", [3, 1, 2, 1, 3, 3, 5, 5], "Next to the airport and Jumbo mall. Handy if you fly often."],
];

const TRE: Row[] = [
  ["Keskusta", "Tampere", 61.498, 23.761, 18, "R", [2, 5, 2, 3, 2, 4, 5, 5], "City centre between two lakes. Restaurants, shops and the tram."],
  ["Tammela", "Tampere", 61.496, 23.778, 17, "R", [3, 3, 2, 2, 3, 4, 4, 5], "Next to the railway station and market square. Easy everyday life."],
  ["Kaleva", "Tampere", 61.497, 23.792, 17, "R", [4, 2, 3, 2, 4, 3, 4, 5], "Calm blocks with parks, on the tram line to the hospital."],
  ["Amuri", "Tampere", 61.5, 23.74, 17, "R", [4, 2, 3, 3, 3, 3, 3, 5], "Old wooden-house museum block and quiet streets west of the centre."],
  ["Pispala", "Tampere", 61.504, 23.705, 15, "B", [5, 2, 5, 5, 3, 3, 2, 5], "Hillside of wooden houses between two lakes. Famous views and saunas."],
  ["Hervanta", "Tampere", 61.45, 23.85, 14, "R", [3, 2, 4, 1, 3, 5, 4, 5], "University campus town. Many international students, tram to the centre."],
  ["Hatanpää", "Tampere", 61.485, 23.77, 16, "B", [4, 1, 4, 4, 4, 3, 3, 5], "Lakeside park and an arboretum, a short ride south of the centre."],
  ["Lielahti", "Tampere", 61.516, 23.68, 14, "R", [4, 1, 4, 4, 4, 2, 3, 5], "Newer lakeside homes at the western end of the tram line."],
];

const HEL_LINES: TransitLine[] = [
  { kind: "metro", name: "Metro", points: [[60.148, 24.656], [60.139, 24.672], [60.144, 24.698], [60.151, 24.723], [60.159, 24.739], [60.171, 24.762], [60.176, 24.787], [60.176, 24.805], [60.185, 24.827], [60.176, 24.836], [60.164, 24.857], [60.159, 24.877], [60.163, 24.915], [60.169, 24.932], [60.171, 24.944], [60.179, 24.951], [60.187, 24.961], [60.1875, 24.978], [60.188, 25.007], [60.195, 25.03], [60.205, 25.043], [60.21, 25.081]] },
  { kind: "metro", points: [[60.21, 25.081], [60.213, 25.095], [60.207, 25.115], [60.209, 25.144]] },
  { kind: "metro", points: [[60.21, 25.081], [60.224, 25.077], [60.236, 25.082], [60.238, 25.11]] },
  { kind: "train", name: "Commuter train", points: [[60.171, 24.941], [60.199, 24.933], [60.22, 24.947], [60.229, 24.968], [60.251, 25.011], [60.292, 25.044]] },
  { kind: "train", points: [[60.292, 25.044], [60.304, 25.029], [60.304, 24.956], [60.3172, 24.9633], [60.316, 24.848], [60.289, 24.859], [60.261, 24.854], [60.249, 24.861], [60.241, 24.877], [60.229, 24.89], [60.218, 24.895], [60.199, 24.933]] },
  { kind: "train", points: [[60.218, 24.895], [60.219, 24.813], [60.21, 24.729], [60.205, 24.656]] },
  { kind: "tram", name: "Light rail (Jokeri)", points: [[60.176, 24.836], [60.188, 24.834], [60.219, 24.813], [60.223, 24.86], [60.218, 24.895], [60.229, 24.928], [60.229, 24.968], [60.226, 25.015], [60.214, 25.055], [60.21, 25.081]] },
];

const TRE_LINES: TransitLine[] = [
  { kind: "tram", name: "Tram", points: [[61.4495, 23.857], [61.46, 23.84], [61.475, 23.815], [61.49, 23.795], [61.497, 23.792], [61.4983, 23.773], [61.498, 23.761], [61.5, 23.74], [61.508, 23.715], [61.516, 23.68], [61.518, 23.665]] },
  { kind: "tram", points: [[61.497, 23.792], [61.502, 23.805], [61.505, 23.813]] },
];

export const SEED_CITIES: City[] = [
  {
    id: "hel",
    title: "Helsinki, Espoo & Vantaa",
    areas: toAreas("hel", HEL),
    destinations: toDests("hel", [
      ["Aalto University, Otaniemi", 60.185, 24.827, true],
      ["University of Helsinki, City Centre", 60.1695, 24.949, true],
      ["University of Helsinki, Kumpula", 60.204, 24.963, false],
      ["University of Helsinki, Viikki", 60.227, 25.018, false],
      ["University of Helsinki, Meilahti", 60.19, 24.905, false],
      ["Hanken School of Economics", 60.172, 24.929, true],
      ["Haaga-Helia, Pasila", 60.201, 24.933, true],
      ["Metropolia, Myllypuro", 60.223, 25.078, true],
      ["Metropolia, Myyrmäki", 60.26, 24.855, true],
      ["Metropolia, Arabia", 60.21, 24.977, false],
      ["Keilaniemi offices, Espoo", 60.176, 24.83, true],
      ["Ruoholahti offices", 60.1635, 24.915, true],
      ["Helsinki Central Station", 60.171, 24.941, true],
      ["Helsinki Airport", 60.3172, 24.9633, true],
    ]),
    lines: HEL_LINES,
  },
  {
    id: "tre",
    title: "Tampere",
    areas: toAreas("tre", TRE),
    destinations: toDests("tre", [
      ["Tampere University, City Centre campus", 61.494, 23.779, true],
      ["Tampere University, Hervanta campus", 61.4495, 23.857, true],
      ["Tampere University, Kauppi (Tays)", 61.505, 23.813, true],
      ["Tampere Central Station", 61.4983, 23.773, true],
    ]),
    lines: TRE_LINES,
  },
];
