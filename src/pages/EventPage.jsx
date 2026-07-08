import { useState } from "react";
import PageHeader from "../components/layout/PageHeader";
import LiveEventPanel from "../components/civic/LiveEventPanel";
import TurnstileWidget from "../components/ui/TurnstileWidget";
import Button from "../components/ui/Button";
import { TURNSTILE_ENABLED } from "../config";

// Presentational. The orchestrator owns the RPC calls (recordEventResponse /
// getEventTally) and passes response + tally down, preserving current behavior.
export default function EventPage({ event, response, tally, onRespond, onBack, error }) {
  // Turnstile (only when the gateway is enabled): the choice buttons stay disabled
  // until a token is available; each response consumes the token and remounts the
  // widget (via a changing key) so a follow-up response gets a fresh one.
  const [tsToken, setTsToken] = useState(null);
  const [tsKey, setTsKey] = useState(0);

  const respond = (choice) => {
    if (TURNSTILE_ENABLED && !tsToken) return;
    onRespond && onRespond(choice, TURNSTILE_ENABLED ? tsToken : undefined);
    if (TURNSTILE_ENABLED) { setTsToken(null); setTsKey((k) => k + 1); }
  };

  return (
    <div className="container event-page">
      <PageHeader
        eyebrow="Today's civic event"
        title="A live question for the public"
        lead="As real budget news breaks, weigh in. Your response joins an anonymous public tally."
      />
      {TURNSTILE_ENABLED && event && (
        <div className="event-page__turnstile">
          <TurnstileWidget key={tsKey} onToken={setTsToken} />
        </div>
      )}
      <LiveEventPanel
        event={event}
        response={response}
        onRespond={respond}
        tally={tally}
        disabled={TURNSTILE_ENABLED && !tsToken}
      />
      {error && <p className="event-page__error" role="alert">{error}</p>}
      {onBack && (
        <div className="event-page__actions">
          <Button variant="secondary" onClick={onBack}>Back to results</Button>
        </div>
      )}
    </div>
  );
}
