"use client";

// The main screen. Holds the user's choices, asks our API for results, and shows the map and list.

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SIZES } from "@/lib/scoring";
import type { City, CityId, MatchRequest, MatchResponse, SizeKey, TraitKey } from "@/lib/types";
import ResultCard from "./ResultCard";
import { TRAIT_LABELS } from "./traits";

// The map uses browser-only APIs, so it loads only in the browser.
const MapView = dynamic(() => import("./MapView"), { ssr: false, loading: () => <div className="map" /> });

type Pin = { name: string; lat: number; lon: number; fast: boolean };

const CITY_TABS: { id: CityId; label: string }[] = [
  { id: "hel", label: "Helsinki region" },
  { id: "tre", label: "Tampere" },
];
const LEGEND = { metro: "Metro", train: "Commuter train", tram: "Tram / light rail" } as const;

export default function AreaMatch() {
  const [cityId, setCityId] = useState<CityId>("hel");
  const [city, setCity] = useState<City | null>(null);
  const [destIndex, setDestIndex] = useState(0);
  const [pin, setPin] = useState<Pin | null>(null);
  const [size, setSize] = useState<SizeKey>("studio");
  const [budget, setBudget] = useState(950);
  const [maxCommute, setMaxCommute] = useState(30);
  const [traits, setTraits] = useState<TraitKey[]>(["nature", "international"]);

  const [data, setData] = useState<MatchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // 1. Load the city (areas, destinations, lines) from our API.
  useEffect(() => {
    let cancelled = false;
    setCity(null);
    fetch(`/api/cities/${cityId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((c: City) => !cancelled && setCity(c))
      .catch(() => !cancelled && setError("Could not load the city data. Check your connection and refresh the page."));
    return () => {
      cancelled = true;
    };
  }, [cityId]);

  const destination = useMemo(() => {
    if (pin) return pin;
    const d = city?.destinations[destIndex] ?? city?.destinations[0];
    return d ? { name: d.name, lat: d.lat, lon: d.lon, fast: d.fast } : null;
  }, [city, destIndex, pin]);

  // 2. Ask our API to score the areas. Wait 250 ms after the last change so sliders feel smooth.
  const requestId = useRef(0);
  useEffect(() => {
    if (!city || !destination) return;
    const id = ++requestId.current;
    const body: MatchRequest = { city: city.id, destination, size, budget, maxCommute, traits };
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/match", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
        const json: MatchResponse = await res.json();
        if (id === requestId.current) {
          setData(json);
          setError(null);
        }
      } catch (e) {
        if (id === requestId.current) setError(`Could not rank the areas: ${(e as Error).message}`);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [city, destination, size, budget, maxCommute, traits]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const switchCity = (id: CityId) => {
    if (id === cityId) return;
    setCityId(id);
    setDestIndex(0);
    setPin(null);
    setData(null);
    if (id === "tre" && budget > 900) setBudget(750);
  };

  const toggleTrait = (k: TraitKey) =>
    setTraits((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k].slice(-3)));

  const pickArea = useCallback(
    (areaId: string) => {
      const el = document.getElementById(`card-${areaId}`);
      if (!el) return showToast("That area is outside your top 10. Try changing your filters.");
      setHighlight(areaId);
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    [showToast],
  );

  const dropPin = useCallback(
    (lat: number, lon: number) => {
      setPin({ name: "your pin", lat, lon, fast: false });
      showToast("Pin dropped. Areas are now ranked by distance to your pin.");
    },
    [showToast],
  );

  const copyShortlist = async () => {
    if (!data || !destination) return;
    const text =
      `My area shortlist for ${destination.name} (${SIZES[size].label}, max €${budget}/mo, max ${maxCommute} min):\n` +
      data.results
        .slice(0, 5)
        .map((r, i) => `${i + 1}. ${r.area.name}, ${r.area.town} – ${r.score} match, €${r.rent.low}–€${r.rent.high}/mo, ~${r.travel.minutes} min`)
        .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      showToast("Shortlist copied");
    } catch {
      showToast("Copy did not work in this browser");
    }
  };

  const results = data?.results ?? [];
  const lineKinds = [...new Set(city?.lines.map((l) => l.kind) ?? [])];

  return (
    <div className="wrap">
      <header className="top">
        <div className="brand">
          <span className="eyebrow">A concept for Flatta · furnished rentals</span>
          <h1>
            Where should you live<span className="q">?</span>
          </h1>
          <p className="lede">
            Tell us where you study or work, your budget and what you like. We rank every area by rent, commute and lifestyle, so you know where to search before you arrive.
          </p>
        </div>
        <div className="cities" role="group" aria-label="City">
          {CITY_TABS.map((c) => (
            <button key={c.id} type="button" aria-pressed={cityId === c.id} onClick={() => switchCity(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
      </header>

      <div className="app">
        <form className="panel" onSubmit={(e) => e.preventDefault()}>
          <div className="field">
            <label htmlFor="dest">I will study or work at</label>
            <select
              id="dest"
              value={pin ? "pin" : String(destIndex)}
              onChange={(e) => {
                if (e.target.value === "pin") return;
                setPin(null);
                setDestIndex(Number(e.target.value));
              }}
            >
              {city?.destinations.map((d, i) => (
                <option key={d.id} value={i}>
                  {d.name}
                </option>
              ))}
              {pin && <option value="pin">Your pin on the map</option>}
            </select>
            <p className="hint">Or click anywhere on the map to drop your own pin.</p>
          </div>

          <div className="field">
            <span className="lbl">Home size</span>
            <div className="seg" role="group" aria-label="Home size">
              {(Object.keys(SIZES) as SizeKey[]).map((k) => (
                <button key={k} type="button" aria-pressed={size === k} onClick={() => setSize(k)}>
                  {SIZES[k].label}
                  <small>~{SIZES[k].m2} m²</small>
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="budget">
              Max rent per month <span className="val">€{budget.toLocaleString("en-US")}</span>
            </label>
            <input id="budget" type="range" min={500} max={2500} step={25} value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
          </div>

          <div className="field">
            <label htmlFor="commute">
              Max commute, one way <span className="val">{maxCommute} min</span>
            </label>
            <input id="commute" type="range" min={10} max={60} step={5} value={maxCommute} onChange={(e) => setMaxCommute(Number(e.target.value))} />
          </div>

          <div className="field">
            <span className="lbl">
              What matters to you? <span className="val">{traits.length}/3</span>
            </span>
            <div className="chips" role="group" aria-label="Lifestyle">
              {(Object.keys(TRAIT_LABELS) as TraitKey[]).map((k) => (
                <button key={k} type="button" aria-pressed={traits.includes(k)} onClick={() => toggleTrait(k)}>
                  {TRAIT_LABELS[k]}
                </button>
              ))}
            </div>
            <p className="hint">Pick up to three.</p>
          </div>
        </form>

        <div className="main">
          <section className="mapcard" aria-label="Map">
            <div className="maphead">
              <h2>{city?.title ?? "Loading…"}</h2>
              <div className="legend">
                {lineKinds.map((k) => (
                  <span key={k}>
                    <i style={{ background: `var(--${k})` }} />
                    {LEGEND[k]}
                  </span>
                ))}
              </div>
            </div>
            {city && destination ? (
              <MapView city={city} results={results} destination={destination} onPickArea={pickArea} onDropPin={dropPin} />
            ) : (
              <div className="map" />
            )}
          </section>

          {error && <div className="error">{error}</div>}

          <section className={`results ${loading ? "loading" : ""}`} aria-live="polite" aria-busy={loading}>
            <div className="reshead">
              <h2>Best areas for {destination?.name ?? "…"}</h2>
              <button className="btn" type="button" onClick={copyShortlist} disabled={!data}>
                Copy my shortlist
              </button>
            </div>
            {data && (
              <div className="status">
                <span className={data.liveTravel ? "on" : ""}>{data.liveTravel ? "● Live travel times (HSL / Nysse)" : "Estimated travel times"}</span>
                <span className={data.dataSource === "database" ? "on" : ""}>{data.dataSource === "database" ? "● Data from database" : "Built-in data"}</span>
              </div>
            )}
            {results.slice(0, 10).map((r, i) => (
              <ResultCard key={r.area.id} result={r} rank={i + 1} traits={traits} highlighted={highlight === r.area.id} />
            ))}
            {results.length > 0 && (
              <p className="hint">
                Showing the top 10 of {results.length} areas. Bar colours: <span style={{ color: "var(--part-rent)" }}>rent</span>,{" "}
                <span style={{ color: "var(--part-commute)" }}>commute</span>, <span style={{ color: "var(--part-life)" }}>lifestyle</span>.
              </p>
            )}
          </section>

          <details>
            <summary>How the match score works</summary>
            <p>Each area gets a score out of 100 made of three parts:</p>
            <ul>
              <li>
                <b>Rent (35%)</b>. We estimate furnished rent from the average rent per square metre in the area, plus 10–30% for furniture and flexible contracts.
              </li>
              <li>
                <b>Commute (35%)</b>. Real morning travel times from the HSL and Nysse journey planners when available, otherwise an estimate from distance and transport type.
              </li>
              <li>
                <b>Lifestyle (30%)</b>. Each area has a 1–5 rating for things like nightlife, nature and being near water. We average the ones you picked.
              </li>
            </ul>
          </details>

          <footer>
            Unofficial concept, not a Flatta product. Map © OpenStreetMap contributors, tiles by OpenFreeMap. Rent levels are estimates.
          </footer>
        </div>
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
