import { fmt } from "../../lib/taxEstimator";

// Missing display name renders as neutral "Your" — never blank or "undefined".
export default function ResultsHero({ name, region, county, annualTotal, dateStr }) {
  const owner = name && name.trim() ? `${name.trim()}\u2019s` : "Your";
  const place = [region, county && county.trim() ? county.trim() : null].filter(Boolean).join(" \u00b7 ");
  return (
    <header className="results-hero">
      <p className="eyebrow">A nonpartisan public record</p>
      <h1 className="results-hero__title">{owner} People&rsquo;s Budget</h1>
      <dl className="results-hero__meta">
        {place && (
          <div className="results-hero__meta-item">
            <dt className="label">Location</dt>
            <dd>{place}</dd>
          </div>
        )}
        <div className="results-hero__meta-item">
          <dt className="label">Annual contribution</dt>
          <dd className="num">{fmt(annualTotal)}</dd>
        </div>
        {dateStr && (
          <div className="results-hero__meta-item">
            <dt className="label">Completed</dt>
            <dd>{dateStr}</dd>
          </div>
        )}
      </dl>
    </header>
  );
}
