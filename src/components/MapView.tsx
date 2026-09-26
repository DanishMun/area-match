"use client";

// A real street map (MapLibre + free OpenFreeMap tiles) with transit lines,
// one marker per area coloured by its match score, and the destination star.

import maplibregl from "maplibre-gl";
import { useEffect, useRef } from "react";
import type { City, MatchResult } from "@/lib/types";

const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const LINE_COLORS = { metro: "#F2601C", train: "#8C4799", tram: "#00985F" };

interface Props {
  city: City;
  results: MatchResult[];
  destination: { lat: number; lon: number; name: string };
  onPickArea: (areaId: string) => void;
  onDropPin: (lat: number, lon: number) => void;
}

export default function MapView({ city, results, destination, onPickArea, onDropPin }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const ready = useRef(false);
  // Keep latest callbacks without re-creating the map.
  const cb = useRef({ onPickArea, onDropPin });
  cb.current = { onPickArea, onDropPin };

  // Create the map once.
  useEffect(() => {
    if (!box.current) return;
    const m = new maplibregl.Map({ container: box.current, style: STYLE_URL, center: [24.94, 60.19], zoom: 10, attributionControl: { compact: true } });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    m.on("click", (e) => cb.current.onDropPin(e.lngLat.lat, e.lngLat.lng));
    m.on("load", () => {
      ready.current = true;
    });
    map.current = m;
    return () => m.remove();
  }, []);

  // Draw transit lines and fit the view whenever the city changes.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const draw = () => {
      const data: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: city.lines.map((l) => ({
          type: "Feature",
          properties: { color: LINE_COLORS[l.kind], width: l.kind === "metro" ? 4 : 3 },
          geometry: { type: "LineString", coordinates: l.points.map(([lat, lon]) => [lon, lat]) },
        })),
      };
      const src = m.getSource("lines") as maplibregl.GeoJSONSource | undefined;
      if (src) src.setData(data);
      else {
        m.addSource("lines", { type: "geojson", data });
        m.addLayer({
          id: "lines",
          type: "line",
          source: "lines",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": ["get", "color"], "line-width": ["get", "width"], "line-opacity": 0.55 },
        });
      }
    };
    // Zoom to the city right away (this works even before the map style has loaded).
    const b = new maplibregl.LngLatBounds();
    city.areas.forEach((a) => b.extend([a.lon, a.lat]));
    city.destinations.forEach((d) => b.extend([d.lon, d.lat]));
    m.fitBounds(b, { padding: 40, duration: 0 });
    // Lines need the style to be loaded first.
    if (ready.current) draw();
    else m.once("load", draw);
  }, [city]);

  // Markers for areas and the destination.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    markers.current.forEach((mk) => mk.remove());
    markers.current = [];

    // Destination star first, so area markers sit on top of it.
    const star = document.createElement("div");
    star.className = "pin-dest";
    star.title = destination.name;
    star.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 6.5 7 .9-5.1 4.8 1.3 7-6.2-3.4-6.2 3.4 1.3-7L2 9.4l7-.9z"/></svg>`;
    markers.current.push(new maplibregl.Marker({ element: star }).setLngLat([destination.lon, destination.lat]).addTo(m));

    [...results].reverse().forEach((r) => {
      const rank = results.indexOf(r) + 1;
      const size = Math.round(14 + (r.score / 100) * 14);
      const el = document.createElement("button");
      el.type = "button";
      el.className = `pin-area ${r.score >= 80 ? "hi" : r.score >= 60 ? "mid" : ""}`;
      el.style.width = el.style.height = `${size}px`;
      el.textContent = rank <= 3 ? String(rank) : "";
      el.setAttribute("aria-label", `${rank}. ${r.area.name}, ${r.score} match`);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        cb.current.onPickArea(r.area.id);
      });
      const popup = new maplibregl.Popup({ offset: 12, closeButton: false }).setHTML(
        `<b>${rank}. ${r.area.name}</b><br>${r.score} match · €${r.rent.low}–€${r.rent.high}/mo<br>~${r.travel.minutes} min`,
      );
      el.addEventListener("mouseenter", () => popup.setLngLat([r.area.lon, r.area.lat]).addTo(m));
      el.addEventListener("mouseleave", () => popup.remove());
      markers.current.push(new maplibregl.Marker({ element: el }).setLngLat([r.area.lon, r.area.lat]).addTo(m));
    });

  }, [results, destination]);

  return <div ref={box} className="map" role="region" aria-label="Map of areas. Click the map to drop your own pin." />;
}
