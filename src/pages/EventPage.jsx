import PageHeader from "../components/layout/PageHeader";
import LiveEventPanel from "../components/civic/LiveEventPanel";
import Button from "../components/ui/Button";

// Presentational. The orchestrator owns the RPC calls (recordEventResponse /
// getEventTally) and passes response + tally down, preserving current behavior.
export default function EventPage({ event, response, tally, onRespond, onBack, error }) {
  return (
    <div className="container event-page">
      <PageHeader
        eyebrow="Today's civic event"
        title="A live question for the public"
        lead="As real budget news breaks, weigh in. Your response joins an anonymous public tally."
      />
      <LiveEventPanel event={event} response={response} onRespond={onRespond} tally={tally} />
      {error && <p className="event-page__error" role="alert">{error}</p>}
      {onBack && (
        <div className="event-page__actions">
          <Button variant="secondary" onClick={onBack}>Back to results</Button>
        </div>
      )}
    </div>
  );
}
