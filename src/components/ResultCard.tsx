import type { MatchResult, TraitKey } from "@/lib/types";
import { TRAIT_LABELS } from "./traits";

const eur = (n: number) => "€" + n.toLocaleString("en-US");

const BUDGET_LABEL = { ok: "In budget", near: "A bit over", over: "Over budget" };
const COMMUTE_LABEL = { ok: "Short trip", near: "A bit long", over: "Long trip" };

const Home = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M2.5 7.5 8 3l5.5 4.5V13h-11z" /></svg>
);
const Train = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="3.5" y="2.5" width="9" height="9" rx="2" /><path d="M5 14l1.5-2.5M11 14l-1.5-2.5M3.5 8h9" /></svg>
);
const Bike = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="4" cy="11" r="2.5" /><circle cx="12" cy="11" r="2.5" /><path d="M4 11l3-5h3l2 5M7 6 6 4.5H4.5" /></svg>
);

interface Props {
  result: MatchResult;
  rank: number;
  traits: TraitKey[];
  highlighted: boolean;
}

export default function ResultCard({ result: r, rank, traits, highlighted }: Props) {
  const strong = traits.filter((k) => r.area.traits[k] >= 4);
  const weak = traits.filter((k) => r.area.traits[k] <= 2);
  return (
    <article id={`card-${r.area.id}`} className={`card ${rank <= 3 ? "top" : ""} ${highlighted ? "hl" : ""}`}>
      <div className="rank">{rank}</div>
      <div>
        <h3>{r.area.name}</h3>
        <span className="town">{r.area.town}</span>
        <p>{r.area.blurb}</p>
      </div>
      <div className="score">
        <b>{r.score}</b>
        <span>match</span>
      </div>

      <div className="facts">
        <span className="fact">
          <Home />
          <span className="num">{eur(r.rent.low)}–{eur(r.rent.high)}</span>/mo
          <span className={`pill ${r.budgetStatus}`}>{BUDGET_LABEL[r.budgetStatus]}</span>
        </span>
        <span className="fact">
          <Train />
          <span className="num">~{r.travel.minutes} min</span> by {r.travel.how}
          <span className={`pill ${r.commuteStatus}`}>{COMMUTE_LABEL[r.commuteStatus]}</span>
          {r.travel.source === "live" && <span className="live" title="Real journey planner result">Live</span>}
        </span>
        <span className="fact">
          <Bike />
          <span className="num">~{r.travel.bikeMinutes} min</span> by bike
        </span>
      </div>

      <div className="bar" title="Score parts: rent, commute, lifestyle">
        <i style={{ width: `${r.parts.rent * 100}%`, background: "var(--part-rent)" }} />
        <i style={{ width: `${r.parts.commute * 100}%`, background: "var(--part-commute)" }} />
        <i style={{ width: `${r.parts.lifestyle * 100}%`, background: "var(--part-life)" }} />
      </div>

      <div className="why">
        {strong.map((k) => <span key={k}>Good for: {TRAIT_LABELS[k]}</span>)}
        {weak.map((k) => <span key={k}>Less: {TRAIT_LABELS[k]}</span>)}
        <a href="https://flatta.fi/en-US" target="_blank" rel="noopener noreferrer">Find furnished homes on Flatta →</a>
      </div>
    </article>
  );
}
