// US state NAMES accepted for the `region` field — mirrors the frontend
// STATES list (Object.keys(STATE_TAX_RATES) in src/data/taxConstants.js).
// NOTE: the app submits FULL state names (e.g. "Pennsylvania"), not 2-letter
// codes; existing votes and get_pulse filter on these exact values. Keep in sync
// with the frontend list if states are ever added/removed.
export const US_STATES = new Set<string>([
  "Alabama", "Alaska", "Arizona",
  "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida",
  "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts",
  "Michigan", "Minnesota", "Mississippi",
  "Missouri", "Montana", "Nebraska",
  "Nevada", "New Hampshire", "New Jersey",
  "New Mexico", "New York", "North Carolina",
  "North Dakota", "Ohio", "Oklahoma",
  "Oregon", "Pennsylvania", "Rhode Island",
  "South Carolina", "South Dakota", "Tennessee",
  "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming",
]);
