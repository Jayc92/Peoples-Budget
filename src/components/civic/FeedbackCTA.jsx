import { BETA_FEEDBACK_EMAIL } from "../../config";

const SUBJECT = "The People's Budget beta feedback";
const BODY_TEMPLATE = "What confused me:\nWhat broke:\nDevice/browser:\nAnything else:";

// Beta-only, low-risk feedback prompt. Intentionally does not attach any
// user data (no income, ZIP/county, device id, or allocation payload) — it's
// a plain mailto with a blank template the tester fills in themselves.
// Renders a muted "coming soon" note instead of a link until an owner sets
// VITE_BETA_FEEDBACK_EMAIL; never blocks or interrupts the results flow.
export default function FeedbackCTA() {
  const configured = !!BETA_FEEDBACK_EMAIL;
  const href = configured
    ? `mailto:${BETA_FEEDBACK_EMAIL}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(BODY_TEMPLATE)}`
    : null;

  return (
    <section className="feedback-cta" aria-label="Beta feedback">
      <h3 className="feedback-cta__title">Help improve the beta</h3>
      <p className="feedback-cta__body">
        Spot something confusing or broken? Send quick feedback so we can improve the next version.
      </p>
      {configured ? (
        <a className="btn btn--secondary" href={href}>Send feedback</a>
      ) : (
        <p className="feedback-cta__soon">Feedback channel coming soon.</p>
      )}
    </section>
  );
}
