// Tax estimation. Logic preserved exactly from the original app's inline code.
import {
  STANDARD_DEDUCTION, BRACKETS, STATE_TAX_RATES, INCOME_RANGES,
  FICA_RATE, LOCAL_RATE, PERIODS,
} from "../data/taxConstants";

export function calcFederalTax(income, filing) {
  const taxable = Math.max(0, income - STANDARD_DEDUCTION[filing]);
  let tax = 0;
  for (const b of BRACKETS[filing]) {
    if (taxable <= b.min) break;
    tax += (Math.min(taxable, b.max) - b.min) * b.rate;
  }
  return tax;
}

export function bracketIdxFor(income) {
  const t = [25000, 50000, 75000, 100000, 150000, 250000, 500000];
  let i = 0;
  while (i < t.length && income >= t[i]) i++;
  return i;
}

// Resolve an income amount from form state (exact value or range midpoint).
export function incomeFromForm(form) {
  return form.useExact
    ? parseFloat((form.exactIncome || "").replace(/,/g, "")) || 0
    : INCOME_RANGES[form.incomeIdx].mid;
}

// Full tax estimate. Mirrors the original useEffect computation exactly.
export function computeTaxes(income, filing, state, payFreq) {
  if (!(income > 0)) return null;
  const federal = calcFederalTax(income, filing);
  const fica = income * FICA_RATE;
  const stateAmt = income * (STATE_TAX_RATES[state] || 0);
  const local = income * LOCAL_RATE;
  const total = federal + fica + stateAmt + local;
  const periods = PERIODS[payFreq] || 26;
  return {
    income,
    federal,
    fica,
    federalAmt: federal + fica,
    stateAmt,
    countyAmt: local,
    total,
    effectiveRate: total / income,
    perPeriod: total / periods,
  };
}

// Formatting helpers
export function fmt(n) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
export function realPct(v) {
  return v < 1 ? "<1" : v;
}
