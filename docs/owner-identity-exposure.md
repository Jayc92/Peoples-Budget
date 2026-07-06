# Owner-Identity Exposure Audit

Goal: keep the owner's *personal* identity off public technical assets where possible.
**Honest limit:** store enrollment, payment, domain, tax, and legal processes may require
real identity — those cannot be hidden (see store-identity-decision.md). This audit
covers what *can* be controlled.

## Findings by category

### Public by design (cannot remove)
- **App-store seller/developer identity** (if native ships): personal legal name
  (individual) or entity name (org). → Use an **organization/entity** to avoid the
  personal name (store-identity-decision.md).
- **Domain registration** may be publicly associated unless domain privacy is used.
- **Support contact** shown on store listings / privacy policy.

### Public but optional (change to a brand/entity identity)
- **GitHub repository owner** — currently a **personal account** (`Jayc92`), which ties
  the repo (and its commit history) to the owner. → Create a **GitHub organization** and
  transfer the repo; use a neutral org name.
- **Support / privacy-policy email** — use a **role-based** address
  (`support@thepeoplesbudget.us`), never a personal Gmail.
- **Domain WHOIS** — enable **domain privacy / registrar proxy** where lawful.
- **SSL cert metadata** — for a standard Vercel/managed cert this exposes the domain, not
  a person; fine.

### Hidden from ordinary users but discoverable
- **Git commit author name/email in history** — commits carry the author identity. Set a
  **GitHub noreply email** and a neutral author name for **future** commits; only rewrite
  old history after a full backup + impact review (rewriting breaks clones/links).
- **Deployment metadata** — Vercel/Supabase project owner and dashboards reflect the
  owner account. Not public, but visible to the platform and via some headers; consider a
  project-scoped/team account if avoiding personal linkage matters.
- **Production source maps** — **not emitted** (Vite default is sourcemap off; verified).
  Keep it that way so original source/paths aren't shipped.

### Sensitive & unacceptable (must never appear)
- Secrets/keys/passwords, home address where not legally required, personal phone.
  **Working-tree scan for these: clean** (no secrets, no `/Users/…` paths, no personal
  name/email, no `author` field in package.json). Verify **Git history** separately with
  a scanner (see secret audit) since this tree isn't the whole history.

## Remediation plan (owner actions)
1. **Create a GitHub organization**; transfer `Peoples-Budget` to it. *(Public-but-optional)*
2. Configure Git to use a **GitHub noreply email** + neutral author name for new commits:
   `git config user.email "<id>+<name>@users.noreply.github.com"`.
3. Decide on **history rewrite** only after backup + impact review (often not worth it if
   history isn't sensitive — a scan first; rewrite only if a secret/PII is found).
4. Switch all public contact to a **role-based email** on the project domain.
5. Enable **domain privacy** at the registrar.
6. Keep **production source maps off** (already off).
7. For native later: enroll via an **entity** (store-identity-decision.md); protect
   signing keys.
8. Separate any analytics/error-monitoring under a **project account**, not a personal one.

## What this does and doesn't achieve
Reduces casual attribution of the *code and project* to the owner's person. It does **not**
provide legal anonymity: platforms, payment processors, registrars, and tax authorities
will still know the responsible party. Don't advertise anonymity you can't guarantee.
