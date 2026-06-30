import PageHeader from "../components/layout/PageHeader";
import PrivacyNotice from "../components/civic/PrivacyNotice";
import TaxReceipt from "../components/budget/TaxReceipt";
import Button from "../components/ui/Button";

// A restrained, illustrative sample receipt for the preview (not real user data).
const SAMPLE = {
  federal: 8230, fica: 4590, stateAmt: 1840, countyAmt: 600,
  total: 15260, perPeriod: 587, effectiveRate: 0.254,
};

export default function WelcomePage({ hasSavedProfile = false, onBuild, onContinue, activeEvent = null, onEvent }) {
  return (
    <div className="container welcome">
      <div className="welcome__grid">
        <div>
          <PageHeader
            eyebrow="A public budget experiment"
            title="You pay the taxes. Where should the money go?"
            lead="Estimate your federal, state, and local tax contribution, allocate every dollar according to your priorities, and compare your choices with current spending and the public."
          />

          <div className="welcome__cta-group">
            <Button variant="primary" block onClick={onBuild}>Build My Budget</Button>
            {hasSavedProfile && (
              <Button variant="secondary" block onClick={onContinue}>Continue My Budget</Button>
            )}
          </div>

          {activeEvent && onEvent && (
            <button type="button" className="welcome__event" onClick={onEvent}>
              {activeEvent.badge && <span className="welcome__event-badge">{activeEvent.badge}</span>}
              <span className="welcome__event-title">{activeEvent.title}</span>
              <span className="welcome__event-cta">Weigh in on today&rsquo;s question &rarr;</span>
            </button>
          )}

          <div className="welcome__privacy">
            <PrivacyNotice>
              Your exact income and display name stay on this device. Your
              submitted budget includes an anonymous device ID, income range,
              filing status, state, and your allocation. Public results are shown
              only as aggregates.
            </PrivacyNotice>
          </div>
        </div>

        <div className="welcome__preview" aria-hidden="true">
          <TaxReceipt title="Illustrative contribution" taxes={SAMPLE} payFreqLabel="biweekly" />
          <p className="welcome__preview-cap">Example only. Your estimate is calculated from your inputs.</p>
        </div>
      </div>
    </div>
  );
}
