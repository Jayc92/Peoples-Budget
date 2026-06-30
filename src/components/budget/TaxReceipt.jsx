import { fmt } from "../../lib/taxEstimator";

// rows: [{ label, value }], total: { label, value }, perPeriod optional
export default function TaxReceipt({ title = "Your estimated annual public contribution", taxes, payFreqLabel, announce = false }) {
  const liveProps = announce ? { "aria-live": "polite" } : {};
  if (!taxes) {
    return (
      <div className="receipt" {...liveProps}>
        <div className="receipt__head">
          <span className="receipt__title">{title}</span>
        </div>
        <p className="receipt__foot receipt__foot--gap">
          Enter your income and location to see your estimate.
        </p>
      </div>
    );
  }
  return (
    <div className="receipt" {...liveProps}>
      <div className="receipt__head">
        <span className="receipt__title">{title}</span>
      </div>
      <ul className="receipt__rows">
        <li className="receipt__row">
          <span className="receipt__label">Federal income tax</span>
          <span className="receipt__value">{fmt(taxes.federal)}</span>
        </li>
        <li className="receipt__row">
          <span className="receipt__label">Payroll tax (FICA)</span>
          <span className="receipt__value">{fmt(taxes.fica)}</span>
        </li>
        <li className="receipt__row">
          <span className="receipt__label">State estimate</span>
          <span className="receipt__value">{fmt(taxes.stateAmt)}</span>
        </li>
        <li className="receipt__row">
          <span className="receipt__label">Local estimate</span>
          <span className="receipt__value">{fmt(taxes.countyAmt)}</span>
        </li>
        <li className="receipt__row receipt__row--total">
          <span className="receipt__label">Total annual estimate</span>
          <span className="receipt__value">{fmt(taxes.total)}</span>
        </li>
      </ul>
      <p className="receipt__foot">
        About {fmt(taxes.perPeriod)} per paycheck{payFreqLabel ? ` (${payFreqLabel})` : ""}.
        Effective rate ≈ {(taxes.effectiveRate * 100).toFixed(1)}%. Figures are estimates.
      </p>
    </div>
  );
}
