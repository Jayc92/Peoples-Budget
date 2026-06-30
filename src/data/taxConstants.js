// Tax constants (2024). Values preserved exactly from the original app.
// Do not change rates, brackets, or ranges in a UI pass.

export const STANDARD_DEDUCTION = { single: 14600, mfj: 29200, hoh: 21900 };

export const BRACKETS = {
  single: [
    { min: 0, max: 11600, rate: 0.10 }, { min: 11600, max: 47150, rate: 0.12 },
    { min: 47150, max: 100525, rate: 0.22 }, { min: 100525, max: 191950, rate: 0.24 },
    { min: 191950, max: 243725, rate: 0.32 }, { min: 243725, max: 609350, rate: 0.35 },
    { min: 609350, max: Infinity, rate: 0.37 },
  ],
  mfj: [
    { min: 0, max: 23200, rate: 0.10 }, { min: 23200, max: 94300, rate: 0.12 },
    { min: 94300, max: 201050, rate: 0.22 }, { min: 201050, max: 383900, rate: 0.24 },
    { min: 383900, max: 487450, rate: 0.32 }, { min: 487450, max: 731200, rate: 0.35 },
    { min: 731200, max: Infinity, rate: 0.37 },
  ],
  hoh: [
    { min: 0, max: 16550, rate: 0.10 }, { min: 16550, max: 63100, rate: 0.12 },
    { min: 63100, max: 100500, rate: 0.22 }, { min: 100500, max: 191950, rate: 0.24 },
    { min: 191950, max: 243700, rate: 0.32 }, { min: 243700, max: 609350, rate: 0.35 },
    { min: 609350, max: Infinity, rate: 0.37 },
  ],
};

export const STATE_TAX_RATES = {
  "Alabama": 0.05, "Alaska": 0, "Arizona": 0.025, "Arkansas": 0.059, "California": 0.093,
  "Colorado": 0.044, "Connecticut": 0.069, "Delaware": 0.066, "Florida": 0, "Georgia": 0.055,
  "Hawaii": 0.11, "Idaho": 0.058, "Illinois": 0.0495, "Indiana": 0.03, "Iowa": 0.048,
  "Kansas": 0.057, "Kentucky": 0.045, "Louisiana": 0.030, "Maine": 0.0715, "Maryland": 0.0575,
  "Massachusetts": 0.05, "Michigan": 0.0425, "Minnesota": 0.0985, "Mississippi": 0.05, "Missouri": 0.054,
  "Montana": 0.069, "Nebraska": 0.0664, "Nevada": 0, "New Hampshire": 0, "New Jersey": 0.1075,
  "New Mexico": 0.059, "New York": 0.068, "North Carolina": 0.0525, "North Dakota": 0.0290, "Ohio": 0.04,
  "Oklahoma": 0.0475, "Oregon": 0.099, "Pennsylvania": 0.0307, "Rhode Island": 0.0599, "South Carolina": 0.07,
  "South Dakota": 0, "Tennessee": 0, "Texas": 0, "Utah": 0.0485, "Vermont": 0.0875,
  "Virginia": 0.0575, "Washington": 0, "West Virginia": 0.065, "Wisconsin": 0.0765, "Wyoming": 0,
};

export const STATES = Object.keys(STATE_TAX_RATES).sort();

export const INCOME_RANGES = [
  { label: "Under $25k", mid: 18000 }, { label: "$25k – $50k", mid: 37500 },
  { label: "$50k – $75k", mid: 62500 }, { label: "$75k – $100k", mid: 87500 },
  { label: "$100k – $150k", mid: 125000 }, { label: "$150k – $250k", mid: 200000 },
  { label: "$250k – $500k", mid: 375000 }, { label: "$500k+", mid: 650000 },
];

// FICA (Social Security + Medicare employee share) and estimated local rate.
export const FICA_RATE = 0.0765;
export const LOCAL_RATE = 0.01;
export const PERIODS = { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12 };
