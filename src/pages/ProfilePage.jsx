import { useState, useMemo } from "react";
import PageHeader from "../components/layout/PageHeader";
import PrivacyNotice from "../components/civic/PrivacyNotice";
import TaxReceipt from "../components/budget/TaxReceipt";
import Button from "../components/ui/Button";
import Field from "../components/ui/Field";
import SelectField from "../components/ui/SelectField";
import { STATES, INCOME_RANGES } from "../data/taxConstants";
import { computeTaxes, incomeFromForm } from "../lib/taxEstimator";

const FILING = [["single", "Single"], ["mfj", "Married, joint"], ["hoh", "Head of household"]];
const FREQ = [["weekly", "Weekly"], ["biweekly", "Every two weeks"], ["semimonthly", "Twice a month"], ["monthly", "Monthly"]];
const FREQ_LABEL = Object.fromEntries(FREQ);

const DEFAULT_FORM = {
  username: "", incomeIdx: 2, useExact: false, exactIncome: "",
  filing: "single", state: "Pennsylvania", county: "", payFreq: "biweekly",
};

// LOCAL-v1A: light, non-blocking validation for the optional "ZIP code or
// county" field. Never blocks continuing — only shows a gentle inline note.
// Blank is always valid. A 5-digit ZIP is valid. Otherwise, a reasonable
// place-name-shaped string (letters, spaces, hyphens, periods, apostrophes)
// is accepted as-is; only clearly non-place-like input gets a soft note.
function localContextNote(raw) {
  const v = (raw || "").trim();
  if (!v) return null;
  if (/^\d{5}$/.test(v)) return null;
  if (/^[A-Za-z][A-Za-z .'-]{1,49}$/.test(v)) return null;
  return "That doesn't quite look like a ZIP code or county name — feel free to leave it as-is or adjust it.";
}

// Ledger section wrapper
function Section({ num, title, children }) {
  return (
    <section className="ledger-section">
      <div className="ledger-section__head">
        <span className="ledger-section__num">{num}</span>
        <span className="ledger-section__title">{title}</span>
      </div>
      {children}
    </section>
  );
}

export default function ProfilePage({ initialForm, onSubmit, onBack }) {
  const [form, setForm] = useState({ ...DEFAULT_FORM, ...(initialForm || {}) });
  const set = (field) => (e) => {
    const v = e && e.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e;
    setForm((f) => ({ ...f, [field]: v }));
  };

  const income = useMemo(() => incomeFromForm(form), [form.useExact, form.exactIncome, form.incomeIdx]);
  const taxes = useMemo(
    () => computeTaxes(income, form.filing, form.state, form.payFreq),
    [income, form.filing, form.state, form.payFreq]
  );
  const canContinue = income > 0 && !!form.state;

  return (
    <div className="container profile">
      <PageHeader
        eyebrow="Step 1 — Your estimate"
        title="Tell us a little, privately"
        lead="We use this only to estimate your tax contribution. This isn't an account — your exact income and display name stay on this device."
      />

      <div className="profile__layout">
        <div>
          <Section num="01" title="Display name">
            <Field
              label="Display name or nickname"
              hint="Optional. Appears on your result and share card. Stored only in this browser."
              value={form.username}
              onChange={set("username")}
              placeholder="Optional"
              autoComplete="off"
            />
          </Section>

          <Section num="02" title="Income">
            <div className="income-mode">
              <span className="field__label">How would you like to enter income?</span>
              <div className="segmented" role="group" aria-label="Income entry mode">
                <button type="button" className="segmented__item" aria-pressed={!form.useExact} onClick={() => setForm((f) => ({ ...f, useExact: false }))}>Range</button>
                <button type="button" className="segmented__item" aria-pressed={form.useExact} onClick={() => setForm((f) => ({ ...f, useExact: true }))}>Exact</button>
              </div>
            </div>
            {form.useExact ? (
              <Field
                label="Annual income"
                localOnly
                inputMode="numeric"
                value={form.exactIncome}
                onChange={set("exactIncome")}
                placeholder="e.g. 62,000"
                hint="Stored only on this device."
              />
            ) : (
              <SelectField
                label="Income range"
                value={form.incomeIdx}
                onChange={(e) => setForm((f) => ({ ...f, incomeIdx: Number(e.target.value) }))}
                options={INCOME_RANGES.map((r, i) => [i, r.label])}
                hint="Used to estimate your taxes and group anonymous results by income range."
              />
            )}
          </Section>

          <Section num="03" title="Filing status">
            <SelectField label="Filing status" value={form.filing} onChange={set("filing")} options={FILING} />
          </Section>

          <Section num="04" title="Your location">
            <SelectField label="State" value={form.state} onChange={set("state")} options={STATES} />
            <Field
              label="ZIP code or county"
              localOnly
              value={form.county}
              onChange={set("county")}
              onBlur={() => setForm((f) => ({ ...f, county: f.county.trim() }))}
              placeholder="Optional"
              hint="Optional: add your ZIP code or county for a more accurate local estimate later. We do not publish your ZIP."
              note={localContextNote(form.county)}
            />
          </Section>

          <Section num="05" title="Pay frequency">
            <SelectField label="How often are you paid?" value={form.payFreq} onChange={set("payFreq")} options={FREQ} />
          </Section>

          <div className="profile__privacy">
            <PrivacyNotice>
              This is not an account. Your exact income and display name remain
              on this device. Your submitted budget is associated only with an
              anonymous device ID, income range, filing status, and state.
            </PrivacyNotice>
          </div>
        </div>

        <div className="profile__estimate">
          <TaxReceipt taxes={taxes} payFreqLabel={FREQ_LABEL[form.payFreq]} announce />
          <div className="profile__actions">
            <Button variant="primary" onClick={() => onSubmit && onSubmit(form)} disabled={!canContinue}>
              Continue to allocation
            </Button>
            {onBack && <Button variant="secondary" onClick={onBack}>Back</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}
