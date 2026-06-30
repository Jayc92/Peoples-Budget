// Budget category data for all three tiers.
// IDs, colors, and `real` (current-government %) values are preserved exactly
// from the original app — do not alter without a coordinated data review.
import {
  Landmark, Users, HeartPulse, Shield, TrendingDown, Medal, GraduationCap,
  Construction, Home, ShieldAlert, Scale, Rocket, Leaf, Globe, Wheat, School,
  Stethoscope, HeartHandshake, Lock, Siren, Bus, Trees, Droplets, Umbrella,
  Building2,
} from "lucide-react";

export const FEDERAL_BUCKETS = [
  { id: "social_security", label: "Social Security", Icon: Users, description: "Retirement & disability benefits", color: "#4A90D9", real: 21 },
  { id: "medicare_medicaid", label: "Medicare & Medicaid", Icon: HeartPulse, description: "Federal health programs", color: "#E05C5C", real: 26 },
  { id: "defense", label: "National Defense", Icon: Shield, description: "Military & armed forces", color: "#7B6B4A", real: 13 },
  { id: "debt_interest", label: "Debt Interest", Icon: TrendingDown, description: "Interest on the national debt", color: "#9B9B9B", real: 13 },
  { id: "income_security", label: "Income Security", Icon: Umbrella, description: "Unemployment, SNAP, SSI, housing aid, tax credits", color: "#C77DBB", real: 11 },
  { id: "veterans", label: "Veterans Benefits", Icon: Medal, description: "VA services & compensation", color: "#3D7A47", real: 5 },
  { id: "education", label: "Education", Icon: GraduationCap, description: "Schools, colleges & job training", color: "#F0A500", real: 3 },
  { id: "transportation", label: "Infrastructure", Icon: Construction, description: "Roads, bridges, transit", color: "#7A4F9B", real: 2 },
  { id: "housing", label: "Housing & Community", Icon: Home, description: "HUD, community development", color: "#E07B39", real: 1 },
  { id: "homeland", label: "Homeland Security", Icon: ShieldAlert, description: "Border, emergency management", color: "#884455", real: 1 },
  { id: "justice", label: "Justice & Law", Icon: Scale, description: "Courts, FBI, prisons", color: "#AA8833", real: 1 },
  { id: "environment", label: "Environment & Energy", Icon: Leaf, description: "EPA, clean energy", color: "#2D8C5F", real: 1 },
  { id: "foreign_aid", label: "Foreign Affairs", Icon: Globe, description: "Diplomacy & foreign assistance", color: "#5577BB", real: 1 },
  { id: "general_gov", label: "General Government", Icon: Landmark, description: "Congress, IRS, other ops", color: "#778899", real: 1 },
  { id: "science", label: "Science & Space", Icon: Rocket, description: "NASA, NSF, research grants", color: "#1AB8D4", real: 0 },
  { id: "agriculture", label: "Agriculture", Icon: Wheat, description: "Farm programs & food safety", color: "#66AA44", real: 0 },
];

export const STATE_BUCKETS = [
  { id: "st_health", label: "Health & Medicaid", Icon: Stethoscope, description: "Medicaid & state health programs", color: "#E05C5C", real: 32 },
  { id: "st_k12", label: "K-12 Education Aid", Icon: School, description: "State funding for schools", color: "#F0A500", real: 19 },
  { id: "st_gov", label: "General Government & Other", Icon: Landmark, description: "Admin, debt service, economic dev", color: "#778899", real: 14 },
  { id: "st_higher", label: "Higher Education", Icon: GraduationCap, description: "State colleges & universities", color: "#4A90D9", real: 9 },
  { id: "st_transport", label: "Highways & Transit", Icon: Construction, description: "State roads & transportation", color: "#7A4F9B", real: 8 },
  { id: "st_safety", label: "Public Safety", Icon: Shield, description: "State police & emergency", color: "#7B6B4A", real: 6 },
  { id: "st_environment", label: "Environment & Parks", Icon: Leaf, description: "State parks & natural resources", color: "#2D8C5F", real: 5 },
  { id: "st_welfare", label: "Public Assistance", Icon: HeartHandshake, description: "Cash aid & social services", color: "#E07B39", real: 4 },
  { id: "st_corrections", label: "Corrections", Icon: Lock, description: "State prisons & justice", color: "#9B9B9B", real: 3 },
];

export const COUNTY_BUCKETS = [
  { id: "co_schools", label: "Local Schools", Icon: School, description: "Local school district funding", color: "#F0A500", real: 39 },
  { id: "co_safety", label: "Police & Fire", Icon: Siren, description: "Local law enforcement & fire", color: "#E05C5C", real: 13 },
  { id: "co_admin", label: "County Admin & Courts", Icon: Scale, description: "Local government, courts, debt", color: "#778899", real: 11 },
  { id: "co_health", label: "Public Health", Icon: HeartPulse, description: "County hospitals & health", color: "#2D8C5F", real: 11 },
  { id: "co_water", label: "Sanitation & Water", Icon: Droplets, description: "Water, sewer, waste, utilities", color: "#1AB8D4", real: 11 },
  { id: "co_roads", label: "Roads & Streets", Icon: Bus, description: "Local roads & maintenance", color: "#7A4F9B", real: 5 },
  { id: "co_social", label: "Social Services", Icon: HeartHandshake, description: "Local welfare & assistance", color: "#E07B39", real: 5 },
  { id: "co_parks", label: "Parks & Libraries", Icon: Trees, description: "Parks, libraries, recreation", color: "#3D7A47", real: 5 },
];

export const TIERS = [
  { id: "federal", label: "Federal", Icon: Landmark, buckets: FEDERAL_BUCKETS, taxKey: "federalAmt" },
  { id: "state", label: "State", Icon: Building2, buckets: STATE_BUCKETS, taxKey: "stateAmt" },
  { id: "county", label: "County / Local", Icon: Home, buckets: COUNTY_BUCKETS, taxKey: "countyAmt" },
];

export const TIER_BY_ID = Object.fromEntries(TIERS.map((t) => [t.id, t]));

// helper: zeroed allocation object for a tier's buckets
export const zeros = (buckets) => Object.fromEntries(buckets.map((b) => [b.id, 0]));

// helper: a fully-zeroed allocation across all three tiers
export const emptyAlloc = () => ({
  federal: zeros(FEDERAL_BUCKETS),
  state: zeros(STATE_BUCKETS),
  county: zeros(COUNTY_BUCKETS),
});
