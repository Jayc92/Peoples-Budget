# Local Accuracy Plan

## Where things stand today
The app's "local" allocation tier (alongside federal and state) is currently
**approximate** — it uses national-average local spending shares (Census Bureau data),
not county- or municipality-specific figures. County and municipal budgets are not
standardized nationally, so there is no simple drop-in dataset for this yet.

## LOCAL-v1A (this pass)
LOCAL-v1A adds **only** an optional local-context UX and a small honesty note. It is a
data-foundation step, not a data-accuracy step:
- An optional **"ZIP code or county"** field on the profile step, so a user can start
  supplying local context.
- A note on the results page clarifying that local estimates are approximate in beta.
- No GPS or browser geolocation is used, and browser location permission is
  **intentionally avoided** — the field is a plain optional text input.
- The raw ZIP/county value is **not stored server-side** in this phase. It stays local
  to the device (same pattern as display name and exact income), is not sent in the
  budget-submit or event-response payloads, and is not shown in the share card/caption.
- Nothing about allocation math, public aggregates, Supabase schema, Edge Functions, or
  RPC signatures changes in this pass.

## Future phases
- **LOCAL-v1B** — ZIP/county → county FIPS mapping, so a supplied ZIP or county name can
  be resolved to a standard identifier.
- **LOCAL-v1C** — a county-aware budget comparison dataset, so local estimates can move
  from national averages to actual county/municipal figures where available.
- **LOCAL-v1D** — optional geolocation, only if user trust and UX warrant it (i.e. only
  after the opt-in, ZIP/county-first approach has proven itself; not assumed as a
  default direction).
- **LOCAL-v2** — municipality/school-district refinement, for users who want a finer
  level of local detail than county.

## Privacy rule
- Local context is collected to **improve estimates**, not to identify or profile
  individuals.
- **Never publish an exact ZIP.** If future phases store local context server-side for
  aggregation, prefer storing only **county/FIPS**, not raw ZIP, and only once a real
  need (e.g. LOCAL-v1B/C) justifies it.
- Any change that would start sending local context to the server requires its own
  privacy review — LOCAL-v1A does not authorize that by itself.

## Data challenge to flag
County and municipal budgets are **not standardized** across jurisdictions — categories,
fiscal years, and reporting formats vary widely. Meaningful normalization work is
required before the app can make any accuracy claim stronger than "approximate,
national-average local estimate." LOCAL-v1B/C should budget real time for this, not
treat it as a simple lookup.
