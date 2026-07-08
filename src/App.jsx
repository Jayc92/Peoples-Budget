import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  loadProfile, saveProfile, submitVote,
  getActiveEvent, recordEventResponse, getEventTally,
} from "./lib/api";
import { TIERS, emptyAlloc } from "./data/budgetBuckets";
import { INCOME_RANGES } from "./data/taxConstants";
import { computeTaxes, incomeFromForm, bracketIdxFor } from "./lib/taxEstimator";
import { allTiersComplete } from "./lib/allocation";

import AppShell from "./components/layout/AppShell";
import WelcomePage from "./pages/WelcomePage";
import ProfilePage from "./pages/ProfilePage";
import AllocationPage from "./pages/AllocationPage";
import ResultsPage from "./pages/ResultsPage";
import EventPage from "./pages/EventPage";

// ── safe defaults (fresh objects every time; never share mutable state) ──────
const DEFAULT_FORM = {
  username: "", incomeIdx: 2, useExact: false, exactIncome: "",
  filing: "single", state: "Pennsylvania", county: "", payFreq: "biweekly",
};
const freshForm = () => ({ ...DEFAULT_FORM });

const FILINGS = ["single", "mfj", "hoh"];
const FREQS = ["weekly", "biweekly", "semimonthly", "monthly"];

// ── profile normalization (supports legacy saved profiles) ───────────────────
function validFiling(f) { return FILINGS.includes(f) ? f : "single"; }
function validFreq(p) { return FREQS.includes(p) ? p : "biweekly"; }
function validIncomeIdx(i) {
  const n = Number(i);
  return Number.isInteger(n) && n >= 0 && n < INCOME_RANGES.length ? n : 2;
}
function normExact(s) {
  if (s == null) return "";
  return String(s).replace(/[^0-9.,]/g, "");
}
// Merge stored allocation against the CURRENT category structure. Unknown keys
// are ignored, missing tiers/categories default to 0, values are clamped to a
// finite 0–100 integer. The allocation is never auto-rebalanced.
function mergeAlloc(raw) {
  const out = emptyAlloc();
  if (raw && typeof raw === "object") {
    for (const tier of TIERS) {
      const rt = raw[tier.id];
      if (rt && typeof rt === "object") {
        for (const b of tier.buckets) {
          const v = Number(rt[b.id]);
          out[tier.id][b.id] = Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : 0;
        }
      }
    }
  }
  return out;
}
function normalizeProfile(raw) {
  if (!raw || typeof raw !== "object") return null;
  const username =
    (typeof raw.displayName === "string" && raw.displayName) ||
    (typeof raw.username === "string" && raw.username) || "";
  const state =
    (typeof raw.state === "string" && raw.state) ||
    (typeof raw.region === "string" && raw.region) || "";
  const form = {
    username,
    incomeIdx: validIncomeIdx(raw.incomeIdx),
    useExact: !!raw.useExact,
    exactIncome: normExact(raw.exactIncome),
    filing: validFiling(raw.filing),
    state,
    county: typeof raw.county === "string" ? raw.county : "",
    payFreq: validFreq(raw.payFreq),
  };
  return {
    form,
    alloc: mergeAlloc(raw.alloc),
    respondedEvents: raw.respondedEvents && typeof raw.respondedEvents === "object" ? raw.respondedEvents : {},
    submitted: !!raw.submitted,
    submittedAt: Number.isFinite(raw.submittedAt) ? raw.submittedAt : null,
  };
}
// A saved profile is resumable only with enough usable data to restore it.
function isResumable(norm) {
  if (!norm) return false;
  const income = incomeFromForm(norm.form);
  return income > 0 && !!norm.form.state;
}

export default function App() {
  const [screen, setScreen] = useState("welcome"); // welcome | profile | allocate | results | event
  const [booting, setBooting] = useState(true);
  const [savedProfile, setSavedProfile] = useState(null); // normalized

  const [form, setForm] = useState(freshForm);
  const [alloc, setAlloc] = useState(emptyAlloc);

  const [activeEvent, setActiveEvent] = useState(null);
  const [respondedEvents, setRespondedEvents] = useState({});
  const [eventTally, setEventTally] = useState({ increase: 0, same: 0, decrease: 0 });
  const [eventError, setEventError] = useState(null);
  const [eventReturn, setEventReturn] = useState("results");

  const [saving, setSaving] = useState(false);
  const [submitNotice, setSubmitNotice] = useState(null);
  const [submittedAt, setSubmittedAt] = useState(null);

  const submittingRef = useRef(false);

  // ── derived (no duplicate tax formulas; uses extracted Stage 1 helpers) ────
  const income = useMemo(() => incomeFromForm(form), [form.useExact, form.exactIncome, form.incomeIdx]);
  const taxes = useMemo(
    () => computeTaxes(income, form.filing, form.state, form.payFreq),
    [income, form.filing, form.state, form.payFreq]
  );
  const bracketIdx = form.useExact ? bracketIdxFor(income) : form.incomeIdx;
  const resumable = useMemo(() => isResumable(savedProfile), [savedProfile]);

  // ── boot: restore local profile + load the active event ────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      let norm = null;
      try { norm = normalizeProfile(loadProfile()); } catch (e) { console.error("profile restore failed", e); }
      if (mounted && norm) { setSavedProfile(norm); setRespondedEvents(norm.respondedEvents); }
      try {
        const ev = await getActiveEvent();
        if (mounted) setActiveEvent(ev);
      } catch (e) { console.error("active event load failed", e); }
      if (mounted) setBooting(false);
    })();
    return () => { mounted = false; };
  }, []);

  // ── focus the main region on screen change (no disruptive scroll) ──────────
  useEffect(() => {
    if (booting) return;
    const id = requestAnimationFrame(() => {
      const el = document.getElementById("main-content");
      if (el) el.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [screen, booting]);

  // ── local persistence ──────────────────────────────────────────────────────
  // Every write MERGES onto the currently stored profile, so a save only changes
  // what it intends and never clobbers fields it doesn't own (respondedEvents,
  // submitted, submittedAt, county, future fields). It also keeps the in-memory
  // normalized savedProfile in sync so Welcome/Continue stay accurate.
  const writeProfile = useCallback((patch) => {
    let existing = null;
    try { existing = loadProfile(); } catch (e) { console.error("profile read failed", e); }
    const base = existing && typeof existing === "object" ? existing : {};
    const next = { ...base, ...patch };
    saveProfile(next);
    setSavedProfile(normalizeProfile(next));
  }, []);

  // Snapshot of just the budget fields (form + current allocation).
  const budgetSnapshot = (f = form) => ({
    username: f.username, incomeIdx: f.incomeIdx, useExact: f.useExact,
    exactIncome: f.exactIncome, filing: f.filing, state: f.state,
    county: f.county, payFreq: f.payFreq, alloc,
  });

  // Debounced checkpoint save while allocating (merges; never erases metadata).
  useEffect(() => {
    if (screen !== "allocate") return;
    const t = setTimeout(() => writeProfile(budgetSnapshot()), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alloc, form, screen, writeProfile]);

  // Load the event tally when the event screen opens.
  useEffect(() => {
    if (screen === "event" && activeEvent) {
      getEventTally(activeEvent.id).then(setEventTally).catch((e) => console.error("tally load failed", e));
    }
  }, [screen, activeEvent]);

  // ── navigation / handlers ──────────────────────────────────────────────────
  const startFresh = () => {
    setForm(freshForm());
    setAlloc(emptyAlloc());
    setSubmitNotice(null);
    setSubmittedAt(null);
    setScreen("profile");
  };

  const resume = () => {
    if (!savedProfile) return;
    const restoredAlloc = mergeAlloc(savedProfile.alloc); // fresh object
    setForm({ ...savedProfile.form });
    setAlloc(restoredAlloc);
    setSubmittedAt(savedProfile.submittedAt);
    setSubmitNotice(null);
    // Trust completeness, not the submitted flag alone: a malformed or
    // incomplete saved allocation always opens Allocation for repair.
    const complete = allTiersComplete(restoredAlloc, TIERS);
    setScreen(complete && savedProfile.submitted === true ? "results" : "allocate");
  };

  const handleProfileSubmit = (f) => {
    setForm(f);
    setSubmittedAt(null);
    // Save the budget step locally (no Supabase write). Merges onto the stored
    // profile so respondedEvents and future fields are preserved, but explicitly
    // clears submission metadata: this is the replacement point for a new or
    // edited budget, so a prior completed budget's submitted/submittedAt must not
    // carry over onto the new (and possibly empty) allocation.
    writeProfile({ ...budgetSnapshot(f), submitted: false, submittedAt: null });
    setScreen("allocate");
  };

  const handleAllocSubmit = async (token) => {
    if (submittingRef.current) return; // prevent double submission
    const done = allTiersComplete(alloc, TIERS);
    if (!done) return;

    submittingRef.current = true;
    setSaving(true);
    setSubmitNotice(null);
    const ts = Date.now();
    setSubmittedAt(ts);
    writeProfile({ ...budgetSnapshot(), submitted: true, submittedAt: ts }); // local budget saved first

    try {
      await submitVote(form.state, bracketIdx, form.filing, alloc, token);
    } catch (e) {
      if (e && e.code === "rate_limited") {
        setSubmitNotice({ kind: "info", text: "You've already submitted recently — your earlier budget still counts. You can update again in a few hours." });
      } else if (e && e.code === "invalid_allocation") {
        setSubmitNotice({ kind: "warn", text: "Your budget didn't meet the allocation rules and wasn't submitted. It's saved on this device — adjust it and try again." });
      } else if (e && (e.code === "turnstile_missing" || e.code === "turnstile_failed")) {
        setSubmitNotice({ kind: "warn", text: "We couldn't verify the submission. Your budget is saved on this device — please complete the verification and try again." });
      } else if (e && e.code === "verification_unavailable") {
        setSubmitNotice({ kind: "warn", text: "Verification is temporarily unavailable, so your budget wasn't submitted. It's saved on this device — please try again in a moment." });
      } else {
        console.error("vote submission failed", e && e.code ? e.code : e);
        setSubmitNotice({ kind: "warn", text: "We couldn't reach the server, but your budget is saved on this device." });
      }
    } finally {
      submittingRef.current = false;
      setSaving(false);
      setScreen("results");
    }
  };

  const openEvent = (from) => { setEventError(null); setEventReturn(from); setScreen("event"); };

  const handleEventResponse = async (choice, token) => {
    if (!activeEvent) return;
    const updated = { ...respondedEvents, [activeEvent.id]: choice };
    setRespondedEvents(updated);
    setEventError(null);
    // Update ONLY respondedEvents on the stored profile. Never reconstruct from
    // in-memory form/alloc — when the event is opened from Welcome those may be
    // defaults and would overwrite a saved budget (or fabricate a fake one).
    writeProfile({ respondedEvents: updated });
    try {
      await recordEventResponse(activeEvent.id, choice, token);
      setEventTally(await getEventTally(activeEvent.id));
    } catch (e) {
      const code = e && e.code;
      if (code === "turnstile_missing" || code === "turnstile_failed" || code === "verification_unavailable") {
        setEventError("We couldn't verify your response, so it wasn't saved to the public tally. It's kept on this device — please try again in a moment.");
      } else {
        console.error("event response failed", code || e);
        setEventError("We couldn't save your response just now. It's kept on this device — try again in a moment.");
      }
    }
  };

  // ── render ─────────────────────────────────────────────────────────────────
  const dateStr = useMemo(() => {
    const d = submittedAt ? new Date(submittedAt) : new Date();
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }, [submittedAt]);

  let page;
  if (booting) {
    page = <div className="container"><p className="pulse-note muted" role="status">Loading…</p></div>;
  } else if (screen === "welcome") {
    page = (
      <WelcomePage
        hasSavedProfile={resumable}
        onBuild={startFresh}
        onContinue={resume}
        activeEvent={activeEvent}
        onEvent={() => openEvent("welcome")}
      />
    );
  } else if (screen === "profile") {
    page = (
      <ProfilePage
        initialForm={form}
        onSubmit={handleProfileSubmit}
        onBack={() => setScreen("welcome")}
      />
    );
  } else if (screen === "allocate") {
    page = (
      <AllocationPage
        alloc={alloc}
        onAllocChange={setAlloc}
        taxes={taxes}
        onSubmit={handleAllocSubmit}
        onBack={() => setScreen("profile")}
      />
    );
  } else if (screen === "results") {
    page = (
      <ResultsPage
        profile={{ name: form.username, region: form.state, county: form.county }}
        taxes={taxes}
        alloc={alloc}
        bracketIdx={bracketIdx}
        dateStr={dateStr}
        hasEvent={!!activeEvent}
        onEvent={() => openEvent("results")}
        onRestart={() => setScreen("welcome")}
        submitNotice={submitNotice}
      />
    );
  } else if (screen === "event") {
    page = (
      <EventPage
        event={activeEvent}
        response={activeEvent ? respondedEvents[activeEvent.id] || null : null}
        tally={eventTally}
        onRespond={handleEventResponse}
        onBack={() => setScreen(eventReturn)}
        error={eventError}
      />
    );
  }

  return <AppShell screen={screen}>{page}</AppShell>;
}
