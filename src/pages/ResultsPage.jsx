import { useState, useEffect, useMemo, useCallback } from "react";
import { TIERS } from "../data/budgetBuckets";
import { INCOME_RANGES } from "../data/taxConstants";
import { topDivergences, governmentDollarGap } from "../lib/allocation";
import { getPulse } from "../lib/api";
import ResultsHero from "../components/results/ResultsHero";
import ComparisonControls from "../components/results/ComparisonControls";
import ComparisonTable from "../components/results/ComparisonTable";
import CommunityPulse from "../components/results/CommunityPulse";
import DivergenceHighlights from "../components/results/DivergenceHighlights";
import SharePanel from "../components/results/SharePanel";
import FeedbackCTA from "../components/civic/FeedbackCTA";
import MethodologyNote from "../components/civic/MethodologyNote";
import Button from "../components/ui/Button";

// profile: { name, region, county }
export default function ResultsPage({ profile = {}, taxes, alloc, bracketIdx, dateStr, hasEvent, onEvent, onRestart, submitNotice }) {
  const [mode, setMode] = useState("gov");
  const [filter, setFilter] = useState({ type: "all", value: null });
  const [pulse, setPulse] = useState(null);
  // explicit community-data status: idle | loading | success | empty | error
  const [status, setStatus] = useState("idle");

  const region = profile.region;
  const hasRegion = !!(region && String(region).trim());
  const bracketValid =
    filter.type === "bracket" &&
    Number.isInteger(filter.value) &&
    filter.value >= 0 &&
    filter.value < INCOME_RANGES.length;

  // Keep the selected filter valid. Normalizing the filter STATE (not just the
  // RPC args) guarantees the visible control always matches the query sent.
  useEffect(() => {
    if (filter.type === "region" && !hasRegion) setFilter({ type: "all", value: null });
    else if (filter.type === "bracket" && !bracketValid) setFilter({ type: "all", value: null });
  }, [filter.type, filter.value, hasRegion, bracketValid]);

  const load = useCallback(() => {
    // args derived strictly from the (already-normalized) filter — only the
    // bracket INDEX is ever sent, never exact income.
    let args;
    if (filter.type === "region") args = { dim: "region", region };
    else if (filter.type === "bracket") args = { dim: "bracket", bracket: filter.value };
    else args = { dim: "all" };

    setStatus("loading");
    setPulse(null);
    let cancelled = false;
    getPulse(args)
      .then((p) => {
        if (cancelled) return;
        const hasData = p && p.count > 0;
        setPulse(hasData ? p : null);
        setStatus(hasData ? "success" : "empty");
      })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [filter.type, filter.value, region]);

  useEffect(() => {
    if (mode !== "community") { setStatus("idle"); return; }
    // Don't fire a query for a filter that's about to be normalized away.
    if (filter.type === "region" && !hasRegion) return;
    if (filter.type === "bracket" && !bracketValid) return;
    const cancel = load();
    return cancel;
  }, [mode, filter.type, filter.value, hasRegion, bracketValid, load]);

  const community = mode === "community";
  const success = community && status === "success";
  const communityRef = (tierId) => (success && pulse ? pulse[tierId] : {});

  // Cohorts below the server threshold return no rows → contextual empty copy.
  const emptyMessage =
    filter.type === "bracket" ? "Not enough submitted budgets in this income range yet."
    : filter.type === "region" ? "Not enough submitted budgets in your state yet."
    : "Not enough public data yet.";

  // Share always compares against GOVERNMENT, ranked by estimated dollars.
  const governmentTopDiff = useMemo(() => governmentDollarGap(alloc, TIERS, taxes), [alloc, taxes]);

  const refLabel = community ? "Public" : "Gov";
  const divTitle = community ? "Largest differences from the public" : "Largest differences from current government spending";
  const refNoun = community ? "the public so far" : "the current government allocation";

  return (
    <div className="container container--wide results">
      {submitNotice && (
        <p className={`submit-notice submit-notice--${submitNotice.kind}`} role="alert">
          {submitNotice.text}
        </p>
      )}
      <ResultsHero name={profile.name} region={profile.region} county={profile.county} annualTotal={taxes ? taxes.total : 0} dateStr={dateStr} />

      <ComparisonControls
        mode={mode} onMode={setMode}
        filter={filter} onFilter={setFilter}
        region={region} regionAvailable={hasRegion} userBracket={bracketIdx}
      />

      {!community && (
        <>
          <DivergenceHighlights alloc={alloc} getRefMap={() => null} refNoun={refNoun} title={divTitle} />
          <div className="results__tables">
            {TIERS.map((t) => (
              <ComparisonTable key={t.id} tier={t} allocTier={alloc[t.id]} refMap={null} refLabel={refLabel} />
            ))}
          </div>
        </>
      )}

      {community && (
        <>
          <CommunityPulse status={status} count={pulse ? pulse.count : 0} onRetry={load} emptyMessage={emptyMessage} />
          {success && (
            <>
              <DivergenceHighlights alloc={alloc} getRefMap={communityRef} refNoun={refNoun} title={divTitle} />
              <div className="results__tables">
                {TIERS.map((t) => (
                  <ComparisonTable key={t.id} tier={t} allocTier={alloc[t.id]} refMap={communityRef(t.id)} refLabel={refLabel} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      <SharePanel
        name={profile.name}
        region={profile.region}
        alloc={alloc}
        taxes={taxes}
        annualTotal={taxes ? taxes.total : 0}
        governmentTopDiff={governmentTopDiff}
      />
      <FeedbackCTA />
      <MethodologyNote />

      <div className="results__actions">
        {hasEvent && <Button variant="primary" onClick={onEvent}>Respond to today&rsquo;s event</Button>}
        <Button variant="secondary" onClick={onRestart}>Start over</Button>
      </div>
    </div>
  );
}
