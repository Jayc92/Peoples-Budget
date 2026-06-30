import { LOW_N_THRESHOLD } from "../../config";

// Renders the explicit community-data state. Never silently shows zeroes.
// status: 'loading' | 'empty' | 'error' | 'success'
export default function CommunityPulse({ status, count = 0, onRetry, emptyMessage = "Not enough public data yet." }) {
  if (status === "loading") {
    return <p className="pulse-note muted" role="status">Loading public results…</p>;
  }
  if (status === "error") {
    return (
      <div className="pulse-note pulse-note--error" role="alert">
        <p>We couldn&rsquo;t load public results right now.</p>
        <button type="button" className="btn btn--secondary" onClick={onRetry}>Retry</button>
      </div>
    );
  }
  if (status === "empty") {
    return <p className="pulse-note muted">{emptyMessage}</p>;
  }
  // success
  const low = count < LOW_N_THRESHOLD;
  return (
    <div className={`pulse-note${low ? " pulse-note--low" : ""}`}>
      <p>
        Compared with <span className="num">{count.toLocaleString()}</span> submitted budget{count === 1 ? "" : "s"}.
      </p>
      {low && (
        <p className="pulse-note__prelim">
          Preliminary — based on a small number of responses, so treat these as early signals, not a representative measure.
        </p>
      )}
    </div>
  );
}
