import { useState, useEffect } from "react";
import {
  Vote, Landmark, Users, HeartPulse, Shield, TrendingDown, Medal, GraduationCap,
  Construction, Home, ShieldAlert, Scale, Rocket, Leaf, Globe, Wheat, School,
  Stethoscope, HeartHandshake, Lock, Siren, Bus, Trees, Droplets, Umbrella,
  ChevronLeft, Check, Copy, BarChart3, Radio, EyeOff, Building2
} from "lucide-react";

// ── BUDGET TIERS ────────────────────────────────────────────
const FEDERAL_BUCKETS = [
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

const STATE_BUCKETS = [
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

const COUNTY_BUCKETS = [
  { id: "co_schools", label: "Local Schools", Icon: School, description: "Local school district funding", color: "#F0A500", real: 39 },
  { id: "co_safety", label: "Police & Fire", Icon: Siren, description: "Local law enforcement & fire", color: "#E05C5C", real: 13 },
  { id: "co_admin", label: "County Admin & Courts", Icon: Scale, description: "Local government, courts, debt", color: "#778899", real: 11 },
  { id: "co_health", label: "Public Health", Icon: HeartPulse, description: "County hospitals & health", color: "#2D8C5F", real: 11 },
  { id: "co_water", label: "Sanitation & Water", Icon: Droplets, description: "Water, sewer, waste, utilities", color: "#1AB8D4", real: 11 },
  { id: "co_roads", label: "Roads & Streets", Icon: Bus, description: "Local roads & maintenance", color: "#7A4F9B", real: 5 },
  { id: "co_social", label: "Social Services", Icon: HeartHandshake, description: "Local welfare & assistance", color: "#E07B39", real: 5 },
  { id: "co_parks", label: "Parks & Libraries", Icon: Trees, description: "Parks, libraries, recreation", color: "#3D7A47", real: 5 },
];

const TIERS = [
  { id: "federal", label: "Federal", Icon: Landmark, buckets: FEDERAL_BUCKETS, taxKey: "federalAmt" },
  { id: "state", label: "State", Icon: Building2, buckets: STATE_BUCKETS, taxKey: "stateAmt" },
  { id: "county", label: "County / Local", Icon: Home, buckets: COUNTY_BUCKETS, taxKey: "countyAmt" },
];
const TIER_BY_ID = Object.fromEntries(TIERS.map(t => [t.id, t]));

// ── LIVE EVENTS (content-driven; production fetches these from backend) ──
const EVENTS = [
  {
    id: "evt_sample_conflict",
    active: true,
    badge: "SAMPLE EVENT",
    title: "Overseas Military Conflict Escalates",
    body: "Imagine a major overseas conflict involving U.S. forces intensifies, and lawmakers debate emergency spending. (This is a sample to show how live events work — real ones would be pushed in as news breaks.)",
    prompt: "If the choice were yours, how would this change your National Defense funding?",
    tier: "federal",
    bucketId: "defense",
  },
];
const ACTIVE_EVENT = EVENTS.find(e => e.active) || null;

// ── TAX MATH ────────────────────────────────────────────────
const STANDARD_DEDUCTION = { single: 14600, mfj: 29200, hoh: 21900 };
const BRACKETS = {
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
function calcFederalTax(income, filing) {
  const taxable = Math.max(0, income - STANDARD_DEDUCTION[filing]);
  let tax = 0;
  for (const b of BRACKETS[filing]) { if (taxable <= b.min) break; tax += (Math.min(taxable, b.max) - b.min) * b.rate; }
  return tax;
}
const STATE_TAX_RATES = {
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
const STATES = Object.keys(STATE_TAX_RATES).sort();
const INCOME_RANGES = [
  { label: "Under $25k", mid: 18000 }, { label: "$25k – $50k", mid: 37500 },
  { label: "$50k – $75k", mid: 62500 }, { label: "$75k – $100k", mid: 87500 },
  { label: "$100k – $150k", mid: 125000 }, { label: "$150k – $250k", mid: 200000 },
  { label: "$250k – $500k", mid: 375000 }, { label: "$500k+", mid: 650000 },
];
function bracketIdxFor(income) {
  const t = [25000, 50000, 75000, 100000, 150000, 250000, 500000];
  let i = 0; while (i < t.length && income >= t[i]) i++; return i;
}
function fmt(n) { return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }); }
function realPct(v) { return v < 1 ? "<1" : v; }

// ── STORAGE ─────────────────────────────────────────────────
const PROFILE_KEY = "pb_profile_v2";
const AGG_KEY = "pb_community_agg_v2";
function emptyTierMap() { return { federal: {}, state: {}, county: {} }; }
function emptyAgg() { return { total: { count: 0, ...emptyTierMap() }, byRegion: {}, byBracket: {}, events: {} }; }
async function loadProfile() { try { const r = await window.storage.get(PROFILE_KEY, false); return r ? JSON.parse(r.value) : null; } catch { return null; } }
async function saveProfile(p) { try { await window.storage.set(PROFILE_KEY, JSON.stringify(p), false); } catch (e) { console.error(e); } }
async function loadAgg() { try { const r = await window.storage.get(AGG_KEY, true); return r ? JSON.parse(r.value) : emptyAgg(); } catch { return emptyAgg(); } }
async function mutateAgg(fn) {
  let agg;
  try { const r = await window.storage.get(AGG_KEY, true); agg = r ? JSON.parse(r.value) : emptyAgg(); } catch { agg = emptyAgg(); }
  if (!agg.events) agg.events = {};
  fn(agg);
  try { await window.storage.set(AGG_KEY, JSON.stringify(agg), true); } catch (e) { console.error(e); }
  return agg;
}
function addInto(target, alloc) { for (const k in alloc) target[k] = (target[k] || 0) + alloc[k]; }
async function submitVote(region, bracketIdx, alloc) {
  return mutateAgg(agg => {
    const bump = (node) => {
      node.count += 1;
      for (const t of TIERS) { if (!node[t.id]) node[t.id] = {}; addInto(node[t.id], alloc[t.id]); }
    };
    bump(agg.total);
    if (!agg.byRegion[region]) agg.byRegion[region] = { count: 0, ...emptyTierMap() };
    bump(agg.byRegion[region]);
    const bk = String(bracketIdx);
    if (!agg.byBracket[bk]) agg.byBracket[bk] = { count: 0, ...emptyTierMap() };
    bump(agg.byBracket[bk]);
  });
}
async function recordEventResponse(eventId, choice) {
  return mutateAgg(agg => {
    if (!agg.events[eventId]) agg.events[eventId] = { increase: 0, same: 0, decrease: 0 };
    agg.events[eventId][choice] += 1;
  });
}
function avgFrom(node, tierId) {
  if (!node || !node.count) return {};
  const out = {}; const src = node[tierId] || {};
  for (const k in src) out[k] = Math.round(src[k] / node.count);
  return out;
}
function topDivergences(alloc, buckets, refMap = null) {
  return buckets.map(b => {
    const mine = alloc[b.id] || 0;
    const ref = refMap ? (refMap[b.id] || 0) : b.real;
    return { ...b, mine, ref, diff: mine - ref };
  }).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
}
const SHARE_URL = "thepeoplesbudget.us"; // set to your real domain before launch
function buildCaption(fedAlloc) {
  const div = topDivergences(fedAlloc, FEDERAL_BUCKETS);
  const up = div.filter(d => d.diff > 0)[0], down = div.filter(d => d.diff < 0)[0];
  const parts = [];
  if (up) parts.push(`+${up.diff} to ${up.label}`);
  if (down) parts.push(`${down.diff} from ${down.label}`);
  return `I just built my own federal budget. My biggest changes vs Washington: ${parts.join(", ")}. Where would YOUR taxes go? 👉 ${SHARE_URL} #ThePeoplesBudget`;
}

// ── UI PRIMITIVES ───────────────────────────────────────────
const C = {
  bg: "#0D0D0F", text: "#F0EDE8", blue: "#4A90D9", green: "#5CDB95", amber: "#F0A500", red: "#E05C5C",
};
function AllocationSlider({ bucket, value, remaining, onChange }) {
  const cap = Math.min(100, value + remaining);
  const Icon = bucket.Icon;
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: bucket.color + "1F", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon size={19} color={bucket.color} strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{bucket.label}</div>
            <div style={{ fontSize: 11, color: "#888", marginTop: 1 }}>{bucket.description}</div>
          </div>
        </div>
        <div style={{ background: bucket.color + "33", border: `1px solid ${bucket.color}66`, borderRadius: 8, padding: "4px 10px", fontFamily: "monospace", fontWeight: 700, fontSize: 14, color: bucket.color, minWidth: 52, textAlign: "center" }}>{value}%</div>
      </div>
      <div style={{ position: "relative" }}>
        <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.1)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: `${bucket.real}%`, top: -2, height: 10, width: 2, background: "rgba(255,255,255,0.35)" }} />
          <div style={{ height: "100%", width: `${value}%`, background: bucket.color, borderRadius: 3, transition: "width 0.1s ease" }} />
        </div>
        <input type="range" min={0} max={100} step={1} value={value}
          onChange={e => onChange(Math.min(parseInt(e.target.value), cap))}
          style={{ position: "absolute", top: -4, left: 0, width: "100%", opacity: 0, cursor: "pointer", height: 14 }} />
      </div>
      <div style={{ fontSize: 10, color: "#555", marginTop: 5 }}>Govt actually spends ~{realPct(bucket.real)}% here</div>
    </div>
  );
}
function DonutChart({ buckets, allocations, size = 130 }) {
  const cx = size / 2, cy = size / 2, r = size * 0.4, innerR = size * 0.25;
  let angle = -90; const segments = [];
  const total = Object.values(allocations).reduce((a, b) => a + b, 0) || 1;
  for (const b of buckets) {
    const pct = (allocations[b.id] || 0) / total; const sweep = pct * 360;
    if (sweep === 0) continue;
    const s = angle * (Math.PI / 180), e = (angle + sweep) * (Math.PI / 180);
    const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s), x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e);
    const ix1 = cx + innerR * Math.cos(s), iy1 = cy + innerR * Math.sin(s), ix2 = cx + innerR * Math.cos(e), iy2 = cy + innerR * Math.sin(e);
    const large = sweep > 180 ? 1 : 0;
    segments.push(<path key={b.id} d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${large} 0 ${ix1} ${iy1} Z`} fill={b.color} opacity={0.85} />);
    angle += sweep;
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {segments}
      <circle cx={cx} cy={cy} r={innerR - 4} fill="#111" />
      <text x={cx} y={cy - 4} textAnchor="middle" fill={C.text} fontSize={11} fontFamily="DM Sans" fontWeight={700}>ALLOCATED</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill={total === 100 ? C.green : C.amber} fontSize={15} fontFamily="monospace" fontWeight={800}>{total}%</text>
    </svg>
  );
}

const zeros = (buckets) => Object.fromEntries(buckets.map(b => [b.id, 0]));

export default function App() {
  const [screen, setScreen] = useState("welcome");
  const [booting, setBooting] = useState(true);
  const [savedProfile, setSavedProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ username: "", incomeIdx: 2, exactIncome: "", useExact: true, filing: "single", state: "California", county: "", payFreq: "biweekly" });
  const [taxes, setTaxes] = useState(null);
  const [alloc, setAlloc] = useState({ federal: zeros(FEDERAL_BUCKETS), state: zeros(STATE_BUCKETS), county: zeros(COUNTY_BUCKETS) });
  const [allocTab, setAllocTab] = useState("federal");
  const [agg, setAgg] = useState(null);
  const [aggLoading, setAggLoading] = useState(false);
  const [compareMode, setCompareMode] = useState("gov");
  const [filter, setFilter] = useState({ type: "all", value: null }); // all | region | bracket
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [respondedEvents, setRespondedEvents] = useState({});
  const [eventChoice, setEventChoice] = useState(null);

  const income = form.useExact ? (parseFloat((form.exactIncome || "").replace(/,/g, "")) || 0) : INCOME_RANGES[form.incomeIdx].mid;
  const bracketIdx = form.useExact ? bracketIdxFor(income) : form.incomeIdx;

  useEffect(() => { (async () => { const p = await loadProfile(); if (p) { setSavedProfile(p); if (p.respondedEvents) setRespondedEvents(p.respondedEvents); } setBooting(false); })(); }, []);

  useEffect(() => {
    if (income > 0) {
      const federal = calcFederalTax(income, form.filing);
      const fica = income * 0.0765;
      const st = income * (STATE_TAX_RATES[form.state] || 0);
      const local = income * 0.01;
      const total = federal + fica + st + local;
      const periods = { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12 }[form.payFreq] || 26;
      setTaxes({ income, federal, fica, federalAmt: federal + fica, stateAmt: st, countyAmt: local, total, effectiveRate: total / income, perPeriod: total / periods });
    }
  }, [income, form.state, form.payFreq, form.filing]);

  const tierTotal = (id) => Object.values(alloc[id]).reduce((a, b) => a + b, 0);
  const allDone = TIERS.every(t => tierTotal(t.id) === 100);

  const resumeSaved = () => {
    const p = savedProfile;
    setForm(f => ({ ...f, username: p.username, incomeIdx: p.incomeIdx ?? 2, useExact: p.useExact ?? false, exactIncome: p.exactIncome ?? "", filing: p.filing, state: p.state, county: p.county ?? "", payFreq: p.payFreq ?? "biweekly" }));
    if (p.alloc) setAlloc(p.alloc);
    setUser({ username: p.username, state: p.state, county: p.county });
    setScreen("allocate");
  };
  const handleSignup = () => { if (!form.username || income <= 0) return; setUser({ username: form.username, state: form.state, county: form.county }); setScreen("allocate"); };
  const persist = async (extra = {}) => { await saveProfile({ username: form.username, incomeIdx: form.incomeIdx, useExact: form.useExact, exactIncome: form.exactIncome, filing: form.filing, state: form.state, county: form.county, payFreq: form.payFreq, alloc, respondedEvents, ...extra }); };
  const handleSubmit = async () => {
    if (!allDone) return;
    setSaving(true);
    await persist({ submitted: true });
    const newAgg = await submitVote(form.state, bracketIdx, alloc);
    setAgg(newAgg); setSaving(false); setScreen("results");
  };
  const handleEventResponse = async (choice) => {
    setEventChoice(choice);
    const updated = { ...respondedEvents, [ACTIVE_EVENT.id]: choice };
    setRespondedEvents(updated);
    const newAgg = await recordEventResponse(ACTIVE_EVENT.id, choice);
    setAgg(newAgg);
    await saveProfile({ ...(savedProfile || {}), username: form.username || savedProfile?.username, respondedEvents: updated });
  };

  useEffect(() => { if ((screen === "results" || screen === "pulse" || screen === "event") && !agg) { setAggLoading(true); loadAgg().then(a => { setAgg(a); setAggLoading(false); }); } }, [screen]);

  const S = {
    app: { minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', sans-serif", position: "relative", overflow: "hidden" },
    grain: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")` },
    accent: { position: "fixed", top: -200, right: -200, width: 500, height: 500, borderRadius: "50%", pointerEvents: "none", zIndex: 0, background: "radial-gradient(circle, rgba(74,144,217,0.12) 0%, transparent 70%)" },
    accent2: { position: "fixed", bottom: -100, left: -100, width: 400, height: 400, borderRadius: "50%", pointerEvents: "none", zIndex: 0, background: "radial-gradient(circle, rgba(224,92,92,0.08) 0%, transparent 70%)" },
    container: { position: "relative", zIndex: 2, maxWidth: 680, margin: "0 auto", padding: "40px 20px" },
    card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 32, marginBottom: 20 },
    input: { width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "12px 14px", color: C.text, fontFamily: "'DM Sans', sans-serif", fontSize: 15, outline: "none", marginBottom: 14 },
    label: { display: "block", fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 },
    btn: { background: C.blue, border: "none", borderRadius: 12, padding: "14px 32px", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, cursor: "pointer", width: "100%" },
    btnOutline: { background: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12, padding: "12px 24px", color: C.text, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" },
    h1: { fontFamily: "'Playfair Display', serif", fontSize: 42, fontWeight: 900, lineHeight: 1.1, margin: 0, marginBottom: 12 },
    h2: { fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, margin: 0, marginBottom: 8 },
    pill: (c) => ({ display: "inline-block", background: c + "22", border: `1px solid ${c}44`, borderRadius: 100, padding: "4px 12px", fontSize: 12, fontWeight: 700, color: c }),
    fonts: <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=Playfair+Display:wght@700;900&display=swap" rel="stylesheet" />,
  };
  const back = (to) => <button onClick={() => setScreen(to)} style={{ ...S.btnOutline, width: "auto", marginBottom: 20, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}><ChevronLeft size={15} /> Back</button>;

  // ── WELCOME ──
  if (screen === "welcome") return (
    <div style={S.app}>{S.fonts}<div style={S.grain} /><div style={S.accent} /><div style={S.accent2} />
      <div style={S.container}>
        <div style={{ textAlign: "center", padding: "56px 0 36px" }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "rgba(74,144,217,0.15)", border: "1px solid rgba(74,144,217,0.3)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
            <Vote size={34} color={C.blue} strokeWidth={2} />
          </div>
          <h1 style={S.h1}>The People's<br /><span style={{ color: C.blue }}>Budget</span></h1>
          <p style={{ color: "#999", fontSize: 17, maxWidth: 460, margin: "0 auto 26px", lineHeight: 1.6 }}>
            Where would <em>you</em> put your taxes — federal, state, and local? Allocate every dollar, then see how the public truly leans, regardless of what the headlines say.
          </p>
          {!booting && savedProfile && (
            <div style={{ ...S.card, maxWidth: 360, margin: "0 auto 16px", padding: 18, background: "rgba(74,144,217,0.08)", border: "1px solid rgba(74,144,217,0.3)" }}>
              <div style={{ fontSize: 13, color: "#aaa", marginBottom: 10 }}>Welcome back, <strong style={{ color: C.text }}>@{savedProfile.username}</strong></div>
              <button onClick={resumeSaved} style={{ ...S.btn, fontSize: 14, padding: "10px" }}>Resume My Budget</button>
            </div>
          )}
          <button onClick={() => setScreen("signup")} style={{ ...(savedProfile ? S.btnOutline : S.btn), maxWidth: 280, margin: "0 auto", width: 280 }}>{savedProfile ? "Start Over" : "Cast Your Budget"}</button>
          <p style={{ fontSize: 12, color: "#555", marginTop: 16 }}>Private by default. No name, no address — just an income range and your state.</p>
        </div>
        {ACTIVE_EVENT && (
          <div onClick={() => setScreen("event")} style={{ ...S.card, padding: 18, marginBottom: 20, cursor: "pointer", display: "flex", alignItems: "center", gap: 14, background: "rgba(224,92,92,0.08)", border: "1px solid rgba(224,92,92,0.3)" }}>
            <Radio size={22} color={C.red} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.red, letterSpacing: "0.08em" }}>LIVE EVENT</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{ACTIVE_EVENT.title}</div>
            </div>
            <ChevronLeft size={18} color="#888" style={{ transform: "rotate(180deg)" }} />
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          {[
            { Icon: EyeOff, title: "Private", body: "Income range and state only — never your address or employer." },
            { Icon: Scale, title: "Nonpartisan", body: "No spin. Just where people actually put their money." },
            { Icon: BarChart3, title: "Filterable", body: "See how each income bracket and state really leans." },
          ].map(c => (
            <div key={c.title} style={{ ...S.card, textAlign: "center", padding: 20 }}>
              <div style={{ display: "inline-flex", marginBottom: 10 }}><c.Icon size={24} color={C.blue} /></div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{c.title}</div>
              <div style={{ fontSize: 12, color: "#777", lineHeight: 1.5 }}>{c.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── SIGNUP ──
  if (screen === "signup") return (
    <div style={S.app}>{S.fonts}<div style={S.grain} /><div style={S.accent} />
      <div style={S.container}>
        {back("welcome")}
        <h2 style={S.h2}>Create Your Profile</h2>
        <p style={{ color: "#777", marginBottom: 28, fontSize: 14 }}>We only collect what's needed to estimate your taxes. No email, no address.</p>
        <div style={S.card}>
          <label style={S.label}>Username (public)</label>
          <input style={S.input} placeholder="e.g. TaxpayerJoe42" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
          <label style={S.label}>Annual Salary</label>
          {form.useExact ? (
            <input style={S.input} placeholder="e.g. 75000" type="number" value={form.exactIncome} onChange={e => setForm({ ...form, exactIncome: e.target.value })} />
          ) : (
            <select style={{ ...S.input, appearance: "none" }} value={form.incomeIdx} onChange={e => setForm({ ...form, incomeIdx: parseInt(e.target.value) })}>
              {INCOME_RANGES.map((r, i) => <option key={i} value={i}>{r.label}</option>)}
            </select>
          )}
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#888", marginTop: -6, marginBottom: 14, cursor: "pointer" }}>
            <input type="checkbox" checked={!form.useExact} onChange={e => setForm({ ...form, useExact: !e.target.checked })} />
            Prefer not to share an exact number? Use a range instead.
          </label>
          <label style={S.label}>Filing Status</label>
          <select style={{ ...S.input, appearance: "none" }} value={form.filing} onChange={e => setForm({ ...form, filing: e.target.value })}>
            <option value="single">Single</option><option value="mfj">Married Filing Jointly</option><option value="hoh">Head of Household</option>
          </select>
          <label style={S.label}>State</label>
          <select style={{ ...S.input, appearance: "none" }} value={form.state} onChange={e => setForm({ ...form, state: e.target.value })}>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <label style={S.label}>County / Local Area (optional)</label>
          <input style={S.input} placeholder="e.g. Los Angeles County" value={form.county} onChange={e => setForm({ ...form, county: e.target.value })} />
          <label style={S.label}>Pay Frequency</label>
          <select style={{ ...S.input, appearance: "none" }} value={form.payFreq} onChange={e => setForm({ ...form, payFreq: e.target.value })}>
            <option value="weekly">Weekly</option><option value="biweekly">Bi-Weekly</option><option value="semimonthly">Semi-Monthly</option><option value="monthly">Monthly</option>
          </select>
          {taxes && taxes.income > 0 && (
            <div style={{ background: "rgba(74,144,217,0.1)", border: "1px solid rgba(74,144,217,0.25)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: C.blue, fontWeight: 700, marginBottom: 10 }}>Tax Preview (after standard deduction)</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[["Federal + FICA", fmt(taxes.federalAmt)], ["State Tax", fmt(taxes.stateAmt)], ["Estimated Local", fmt(taxes.countyAmt)], ["Total / Year", fmt(taxes.total)], [`Per ${form.payFreq} check`, fmt(taxes.perPeriod)], ["Effective Rate", (taxes.effectiveRate * 100).toFixed(1) + "%"]].map(([k, v]) => (
                  <div key={k}><div style={{ fontSize: 11, color: "#666" }}>{k}</div><div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 14, color: C.text }}>{v}</div></div>
                ))}
              </div>
            </div>
          )}
          <button onClick={handleSignup} style={S.btn} disabled={!form.username || income <= 0}>Continue to Budget Allocation</button>
        </div>
      </div>
    </div>
  );

  // ── ALLOCATE ──
  if (screen === "allocate") {
    const tier = TIER_BY_ID[allocTab];
    const buckets = tier.buckets;
    const cur = alloc[allocTab];
    const total = tierTotal(allocTab);
    const remaining = 100 - total;
    const taxAmt = taxes ? taxes[tier.taxKey] : 0;
    const setCur = (next) => setAlloc(a => ({ ...a, [allocTab]: next }));
    const autoFill = () => {
      const ids = buckets.map(b => b.id); let next = { ...cur };
      if (total === 0) { const base = Math.floor(100 / ids.length); ids.forEach(id => next[id] = base); next[ids[0]] += 100 - base * ids.length; }
      else { ids.forEach(id => next[id] = Math.round((cur[id] / total) * 100)); const diff = 100 - Object.values(next).reduce((a, b) => a + b, 0); const maxId = ids.reduce((a, b) => next[a] >= next[b] ? a : b); next[maxId] += diff; }
      setCur(next);
    };
    return (
      <div style={S.app}>{S.fonts}<div style={S.grain} /><div style={S.accent} />
        <div style={S.container}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 12, color: "#666", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Logged in as</div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>@{user?.username} · {user?.state}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: "#666" }}>Annual Tax</div>
              <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 18, color: C.blue }}>{taxes ? fmt(taxes.total) : "—"}</div>
            </div>
          </div>

          {ACTIVE_EVENT && !respondedEvents[ACTIVE_EVENT.id] && (
            <div onClick={() => setScreen("event")} style={{ ...S.card, padding: 14, marginBottom: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, background: "rgba(224,92,92,0.08)", border: "1px solid rgba(224,92,92,0.3)" }}>
              <Radio size={18} color={C.red} />
              <span style={{ fontSize: 13, flex: 1 }}><strong style={{ color: C.red }}>Live:</strong> {ACTIVE_EVENT.title} — tap to weigh in</span>
            </div>
          )}

          <div style={{ position: "sticky", top: 0, zIndex: 10, ...S.card, padding: 18, marginBottom: 16, background: remaining === 0 ? "rgba(92,219,149,0.1)" : "rgba(20,20,24,0.95)", border: `1px solid ${remaining === 0 ? "rgba(92,219,149,0.35)" : "rgba(74,144,217,0.3)"}`, backdropFilter: "blur(10px)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>{tier.label} — Remaining</span>
              <span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 24, color: remaining === 0 ? C.green : C.amber }}>{remaining}%</span>
            </div>
            <div style={{ height: 10, borderRadius: 5, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${total}%`, borderRadius: 5, transition: "width 0.2s, background 0.2s", background: remaining === 0 ? C.green : C.blue }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <span style={{ fontSize: 11, color: "#666" }}>{remaining > 0 ? `${remaining} points left in your ${tier.label.toLowerCase()} taxes` : "Fully allocated — rebalance any time"}</span>
              <button onClick={autoFill} style={{ background: "none", border: "none", color: C.blue, fontSize: 11, fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>{total === 0 ? "Split evenly" : "Auto-balance to 100%"}</button>
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {TIERS.map(t => {
              const done = tierTotal(t.id) === 100; const isActive = allocTab === t.id;
              return (
                <button key={t.id} onClick={() => setAllocTab(t.id)} style={{ flex: 1, padding: "11px 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: isActive ? C.blue : "rgba(255,255,255,0.05)", border: `1px solid ${isActive ? C.blue : "rgba(255,255,255,0.1)"}`, borderRadius: 10, color: C.text, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                  <t.Icon size={16} />{t.label}{done && <Check size={12} color={isActive ? "#fff" : C.green} />}
                </button>
              );
            })}
          </div>

          <div style={{ ...S.card, display: "flex", alignItems: "center", gap: 24, padding: 20, marginBottom: 12 }}>
            <DonutChart buckets={buckets} allocations={cur} size={130} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>{tier.label} taxes</div>
              <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 22, color: C.text }}>{taxes ? fmt(taxAmt) : "—"}/yr</div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>The thin white line on each slider marks what government actually spends there.</div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            {buckets.map(b => (
              <AllocationSlider key={b.id} bucket={b} value={cur[b.id] || 0} remaining={remaining}
                onChange={val => setCur({ ...cur, [b.id]: val })} />
            ))}
          </div>

          <div style={{ ...S.card, padding: 20, background: allDone ? "rgba(92,219,149,0.06)" : "rgba(255,255,255,0.03)", border: `1px solid ${allDone ? "rgba(92,219,149,0.25)" : "rgba(255,255,255,0.08)"}` }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {TIERS.map(t => <span key={t.id} style={S.pill(tierTotal(t.id) === 100 ? C.green : C.amber)}>{t.label}: {tierTotal(t.id)}%</span>)}
            </div>
            <button onClick={handleSubmit} disabled={!allDone || saving}
              style={{ ...S.btn, opacity: allDone && !saving ? 1 : 0.4, cursor: allDone && !saving ? "pointer" : "not-allowed", background: allDone ? C.green : C.blue, color: allDone ? C.bg : "#fff" }}>
              {saving ? "Submitting…" : allDone ? "Submit My Budget" : "Allocate 100% in all three tiers to submit"}
            </button>
            <p style={{ fontSize: 11, color: "#555", marginTop: 10, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
              <Lock size={11} /> Your budget stays private. Sharing is always your choice, never required.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── EVENT ──
  if (screen === "event") {
    const tally = agg?.events?.[ACTIVE_EVENT.id] || { increase: 0, same: 0, decrease: 0 };
    const totalResp = tally.increase + tally.same + tally.decrease;
    const myChoice = respondedEvents[ACTIVE_EVENT.id] || eventChoice;
    const focusBucket = TIER_BY_ID[ACTIVE_EVENT.tier].buckets.find(b => b.id === ACTIVE_EVENT.bucketId);
    const opts = [
      { id: "increase", label: "Increase funding", color: C.green },
      { id: "same", label: "Keep it the same", color: C.blue },
      { id: "decrease", label: "Decrease funding", color: C.red },
    ];
    return (
      <div style={S.app}>{S.fonts}<div style={S.grain} /><div style={S.accent} /><div style={S.accent2} />
        <div style={S.container}>
          {back(user ? "allocate" : "welcome")}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={S.pill(C.red)}>{ACTIVE_EVENT.badge}</span>
            <span style={{ fontSize: 11, color: "#666", display: "flex", alignItems: "center", gap: 4 }}><Radio size={12} /> Live event</span>
          </div>
          <h2 style={S.h2}>{ACTIVE_EVENT.title}</h2>
          <p style={{ color: "#999", fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>{ACTIVE_EVENT.body}</p>
          <div style={{ ...S.card, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              {focusBucket && <div style={{ width: 40, height: 40, borderRadius: 10, background: focusBucket.color + "1F", display: "flex", alignItems: "center", justifyContent: "center" }}><focusBucket.Icon size={20} color={focusBucket.color} /></div>}
              <div style={{ fontSize: 15, fontWeight: 600 }}>{ACTIVE_EVENT.prompt}</div>
            </div>
            {!myChoice ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {opts.map(o => (
                  <button key={o.id} onClick={() => handleEventResponse(o.id)} style={{ padding: "14px", borderRadius: 12, background: o.color + "1A", border: `1px solid ${o.color}55`, color: C.text, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15, cursor: "pointer", textAlign: "left" }}>{o.label}</button>
                ))}
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 13, color: "#888", marginBottom: 14 }}>You chose <strong style={{ color: opts.find(o => o.id === myChoice).color }}>{opts.find(o => o.id === myChoice).label}</strong>. Here's how everyone responded:</div>
                {opts.map(o => {
                  const pct = totalResp ? Math.round((tally[o.id] / totalResp) * 100) : 0;
                  return (
                    <div key={o.id} style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                        <span style={{ color: myChoice === o.id ? o.color : C.text, fontWeight: myChoice === o.id ? 700 : 400 }}>{o.label}</span>
                        <span style={{ fontFamily: "monospace", color: o.color, fontWeight: 700 }}>{pct}%</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: o.color, borderRadius: 4 }} /></div>
                    </div>
                  );
                })}
                <div style={{ fontSize: 11, color: "#555", marginTop: 12 }}>{totalResp.toLocaleString()} response{totalResp === 1 ? "" : "s"} so far. This is the read politicians rarely get to see.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── RESULTS ──
  if (screen === "results") {
    const filterNode = filter.type === "all" ? agg?.total : filter.type === "region" ? agg?.byRegion?.[user?.state] : agg?.byBracket?.[String(filter.value)];
    const communityCount = filterNode?.count || 0;
    return (
      <div style={S.app}>{S.fonts}<div style={S.grain} /><div style={S.accent} />
        <div style={S.container}>
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <h2 style={S.h2}>Your Budget vs. {compareMode === "gov" ? "Reality" : "The Public"}</h2>
            <p style={{ color: "#777", fontSize: 14 }}>{compareMode === "gov" ? "Where you'd put your money, next to what government actually does." : aggLoading ? "Loading…" : `Compared against ${communityCount.toLocaleString()} budget${communityCount === 1 ? "" : "s"}.`}</p>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {[["gov", "vs Government", Scale], ["community", "vs The Public", Users]].map(([m, lbl, Ic]) => (
              <button key={m} onClick={() => setCompareMode(m)} style={{ flex: 1, padding: "11px 0", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, background: compareMode === m ? C.blue : "rgba(255,255,255,0.05)", border: `1px solid ${compareMode === m ? C.blue : "rgba(255,255,255,0.1)"}`, borderRadius: 10, color: C.text, fontWeight: 700, fontSize: 13, cursor: "pointer" }}><Ic size={15} />{lbl}</button>
            ))}
          </div>

          {compareMode === "community" && (
            <div style={{ ...S.card, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#888", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Filter the public by</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button onClick={() => setFilter({ type: "all", value: null })} style={chip(filter.type === "all", S)}>Everyone</button>
                <button onClick={() => setFilter({ type: "region", value: user?.state })} style={chip(filter.type === "region", S)}>My State</button>
                {INCOME_RANGES.map((r, i) => (
                  <button key={i} onClick={() => setFilter({ type: "bracket", value: i })} style={chip(filter.type === "bracket" && filter.value === i, S)}>{r.label}</button>
                ))}
              </div>
              <p style={{ fontSize: 11, color: "#555", marginTop: 10 }}>Filtering by bracket is how we keep outliers honest — one person claiming a huge income is just a single data point inside their own tier.</p>
            </div>
          )}

          {TIERS.map(t => {
            const mine = alloc[t.id];
            const ref = compareMode === "gov" ? Object.fromEntries(t.buckets.map(b => [b.id, b.real])) : avgFrom(filterNode, t.id);
            const refLabel = compareMode === "gov" ? "gov" : "avg";
            const taxAmt = taxes ? taxes[t.taxKey] : 0;
            const hideRef = compareMode === "community" && communityCount === 0;
            return (
              <div key={t.id} style={S.card}>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, marginBottom: 16, fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}><t.Icon size={20} color={C.blue} /> {t.label} Budget</h3>
                {hideRef && <p style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>No public data for this filter yet.</p>}
                {t.buckets.filter(b => mine[b.id] > 0 || (ref[b.id] || 0) > 0).map(b => {
                  const refVal = ref[b.id] || 0; const diff = (mine[b.id] || 0) - refVal;
                  return (
                    <div key={b.id} style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 7 }}><b.Icon size={14} color={b.color} /> {b.label}</span>
                        <span style={{ fontSize: 12 }}>
                          <span style={{ color: b.color, fontWeight: 700 }}>{mine[b.id] || 0}%</span>
                          {!hideRef && <><span style={{ color: "#555" }}> · {refLabel} {compareMode === "gov" ? realPct(refVal) : refVal}% </span><span style={{ color: diff > 0 ? C.green : diff < 0 ? C.red : "#666", fontWeight: 700 }}>{diff > 0 ? `+${diff}` : diff}</span></>}
                        </span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <div style={{ height: 7, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}><div style={{ height: "100%", width: `${mine[b.id] || 0}%`, background: b.color, borderRadius: 3 }} /></div>
                        {!hideRef && <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}><div style={{ height: "100%", width: `${refVal}%`, background: "rgba(255,255,255,0.3)", borderRadius: 3 }} /></div>}
                      </div>
                      {taxes && <div style={{ fontSize: 10, color: "#555", marginTop: 3 }}>You'd send {fmt(taxAmt * (mine[b.id] || 0) / 100)} here{!hideRef && ` · ${compareMode === "gov" ? "govt" : "public"} ${fmt(taxAmt * refVal / 100)}`}</div>}
                    </div>
                  );
                })}
              </div>
            );
          })}

          <div style={{ ...S.card, background: "rgba(74,144,217,0.07)" }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              <button onClick={() => setScreen("pulse")} style={{ ...S.btn, flex: "1 1 180px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}><BarChart3 size={17} /> People's Pulse</button>
              <button onClick={() => setScreen("share")} style={{ ...S.btnOutline, flex: "1 1 180px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "14px" }}><Copy size={16} /> Share (optional)</button>
            </div>
            <p style={{ fontSize: 12, color: "#666", textAlign: "center", marginBottom: 12 }}>Sharing is opt-in. Your budget was recorded privately and anonymously the moment you submitted.</p>
            <button onClick={() => setScreen("allocate")} style={{ ...S.btnOutline, width: "100%" }}>Edit My Budget</button>
          </div>
          <p style={{ fontSize: 11, color: "#444", textAlign: "center" }}>Reference shares are approximate FY2024 actuals: federal from OMB/CBO outlays by function; state from NASBO; local from Census of Governments. Smallest categories shown as &lt;1%.</p>
        </div>
      </div>
    );
  }

  // ── SHARE ──
  if (screen === "share") {
    const fedAlloc = alloc.federal;
    const top3 = [...FEDERAL_BUCKETS].map(b => ({ ...b, mine: fedAlloc[b.id] || 0 })).sort((a, b) => b.mine - a.mine).slice(0, 3);
    const div = topDivergences(fedAlloc, FEDERAL_BUCKETS);
    const up = div.filter(d => d.diff > 0)[0], down = div.filter(d => d.diff < 0)[0];
    const caption = buildCaption(fedAlloc);
    const doCopy = async () => { try { await navigator.clipboard.writeText(caption); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {} };
    return (
      <div style={S.app}>{S.fonts}<div style={S.grain} /><div style={S.accent} /><div style={S.accent2} />
        <div style={S.container}>
          {back("results")}
          <p style={{ fontSize: 13, color: "#888", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}><Lock size={13} /> Totally optional — only you decide if this leaves your phone.</p>
          <div style={{ borderRadius: 24, overflow: "hidden", marginBottom: 20, border: "1px solid rgba(255,255,255,0.12)", background: "linear-gradient(160deg, #14223D 0%, #0D0D0F 60%, #1A1424 100%)" }}>
            <div style={{ padding: "28px 28px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: "0.18em", color: C.blue, fontWeight: 700, textTransform: "uppercase" }}>The People's Budget</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 900, marginTop: 4 }}>My Federal Budget</div>
              </div>
              <Vote size={30} color={C.blue} />
            </div>
            <div style={{ padding: "20px 28px" }}>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>My Top Priorities</div>
              {top3.map(b => (
                <div key={b.id} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}><b.Icon size={15} color={b.color} /> {b.label}</span>
                    <span style={{ fontFamily: "monospace", fontWeight: 800, color: b.color }}>{b.mine}%</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}><div style={{ height: "100%", width: `${b.mine}%`, background: b.color, borderRadius: 4 }} /></div>
                </div>
              ))}
              <div style={{ marginTop: 18, padding: 16, borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: 11, color: "#888", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>How I differ from Washington</div>
                <div style={{ display: "flex", gap: 12 }}>
                  {up && <div style={{ flex: 1 }}><div style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 900, color: C.green }}>+{up.diff}</div><div style={{ fontSize: 12, color: "#aaa" }}>{up.label}</div></div>}
                  {down && <div style={{ flex: 1 }}><div style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 900, color: C.red }}>{down.diff}</div><div style={{ fontSize: 12, color: "#aaa" }}>{down.label}</div></div>}
                </div>
              </div>
            </div>
            <div style={{ padding: "16px 28px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.2)" }}>
              <span style={{ fontSize: 12, color: "#888" }}>What would <strong style={{ color: C.text }}>you</strong> fund?</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: C.blue }}>{SHARE_URL}</span>
            </div>
          </div>
          <button onClick={doCopy} style={{ ...S.btn, marginBottom: 12, background: copied ? C.green : C.blue, color: copied ? C.bg : "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}>{copied ? <><Check size={16} /> Caption Copied</> : <><Copy size={16} /> Copy Share Caption</>}</button>
          <div style={{ ...S.card, padding: 16, fontSize: 13, color: "#999", lineHeight: 1.6 }}>
            <div style={{ fontSize: 11, color: "#666", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Caption preview</div>
            "{caption}"
            <p style={{ fontSize: 11, color: "#555", marginTop: 12 }}>Screenshot the card and post it with the caption. On mobile, long-press to save it as an image.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── PULSE ──
  if (screen === "pulse") {
    return <PulseScreen agg={agg} S={S} back={back} setScreen={setScreen} />;
  }
}

function chip(active, S) {
  return { padding: "6px 12px", background: active ? "rgba(74,144,217,0.25)" : "rgba(255,255,255,0.05)", border: `1px solid ${active ? C.blue : "rgba(255,255,255,0.1)"}`, borderRadius: 100, color: C.text, fontSize: 12, fontWeight: 600, cursor: "pointer" };
}

function PulseScreen({ agg, S, back, setScreen }) {
  const [tierId, setTierId] = useState("federal");
  const tier = TIER_BY_ID[tierId];
  const node = agg?.total; const count = node?.count || 0;
  const pubAvg = avgFrom(node, tierId);
  const pubVsGov = count > 0 ? tier.buckets.map(b => ({ ...b, pub: pubAvg[b.id] || 0, gap: (pubAvg[b.id] || 0) - b.real })).sort((a, b) => b.gap - a.gap) : [];
  const wantMore = pubVsGov.filter(d => d.gap > 0).slice(0, 5);
  const wantLess = pubVsGov.filter(d => d.gap < 0).slice(0, 5).reverse();
  return (
    <div style={S.app}>{S.fonts}<div style={S.grain} /><div style={S.accent} /><div style={S.accent2} />
      <div style={S.container}>
        {back("results")}
        <h2 style={S.h2}>The People's Pulse</h2>
        <p style={{ color: "#777", fontSize: 14, marginBottom: 16 }}>{count > 0 ? `Across ${count.toLocaleString()} budget${count === 1 ? "" : "s"}, here's where the public diverges from government — no spin, just the numbers.` : "No budgets in yet — be the first and the public picture starts here."}</p>
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {TIERS.map(t => (
            <button key={t.id} onClick={() => setTierId(t.id)} style={{ flex: 1, padding: "10px 4px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, background: tierId === t.id ? C.blue : "rgba(255,255,255,0.05)", border: `1px solid ${tierId === t.id ? C.blue : "rgba(255,255,255,0.1)"}`, borderRadius: 10, color: C.text, fontWeight: 700, fontSize: 12, cursor: "pointer" }}><t.Icon size={14} />{t.label}</button>
          ))}
        </div>
        {count > 0 ? (
          <>
            <div style={S.card}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 17, marginBottom: 4 }}>The public wants MORE here</h3>
              <p style={{ fontSize: 12, color: "#666", marginBottom: 16 }}>Funded above the government's actual share</p>
              {wantMore.map((d, i) => <PulseRow key={d.id} d={d} i={i} color={C.green} sign="+" />)}
              {wantMore.length === 0 && <p style={{ fontSize: 13, color: "#777" }}>No categories above government levels for this tier.</p>}
            </div>
            <div style={S.card}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 17, marginBottom: 4 }}>The public wants LESS here</h3>
              <p style={{ fontSize: 12, color: "#666", marginBottom: 16 }}>Funded below the government's actual share</p>
              {wantLess.map((d, i) => <PulseRow key={d.id} d={d} i={i} color={C.red} sign="" />)}
              {wantLess.length === 0 && <p style={{ fontSize: 13, color: "#777" }}>No categories below government levels for this tier.</p>}
            </div>
          </>
        ) : <div style={{ ...S.card, textAlign: "center", color: "#888" }}>Submit a budget to seed the public picture.</div>}
        <button onClick={() => setScreen("share")} style={{ ...S.btnOutline, width: "100%" }}>Share Your Budget (optional)</button>
      </div>
    </div>
  );
}
function PulseRow({ d, i, color, sign }) {
  const Icon = d.Icon;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
      <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 13, color: "#555", width: 18 }}>{i + 1}</div>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: d.color + "1F", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={17} color={d.color} /></div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{d.label}</div>
        <div style={{ fontSize: 11, color: "#666" }}>Public {d.pub}% vs Govt {realPct(d.real)}%</div>
      </div>
      <div style={{ display: "inline-block", background: color + "22", border: `1px solid ${color}44`, borderRadius: 100, padding: "4px 12px", fontSize: 12, fontWeight: 700, color, fontFamily: "monospace" }}>{sign}{d.gap}</div>
    </div>
  );
}
