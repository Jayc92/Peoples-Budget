# Store Identity Decision — Apple App Store & Google Play

**Owner decision required before creating any developer account.** Stated owner
preference: *not to be personally identifiable*. This page lays out the real options
using current (2026) Apple and Google requirements. **Do not create accounts before
deciding** — enrollment publicly binds an identity.

> Honest constraint: **you cannot publish to either store while fully anonymous.** Both
> require verified identity, and the *public* seller/developer name is either your
> **personal legal name** (individual) or a **legal entity name** (organization). Payment,
> tax, and platform rules make total anonymity impossible. The realistic way to avoid
> exposing *your personal name* is to form a **legal entity** and enroll as an org.

## Decision matrix

| | **Individual / personal** | **Organization / entity** |
|---|---|---|
| **Apple public seller name** | your **personal legal name** | your **legal entity name** (e.g. "ABC Civic LLC") |
| **Google public "About the developer"** | **legal name + address** shown publicly | **entity name + address**; org must also show a **support phone** publicly |
| **Prerequisites** | Apple ID w/ 2FA; gov photo ID; legal name/email/phone/address | a **registered legal entity** + **D‑U‑N‑S number** + public website on the entity's domain (both stores) |
| **Private verification (not public)** | gov ID (both); contact email/phone for the platform | same, plus entity/D&B verification |
| **Fees** | Apple **$99/yr**; Google **$25 once** | same fees |
| **Timeline** | fast (days) | slower: D‑U‑N‑S can take ~5 business days–2 weeks; entity formation adds time |
| **Privacy tradeoff** | **exposes your personal name** (and address on Google) | **hides your personal name behind the entity**; entity name/address still public |
| **Extra** | Google personal accounts need a **closed test (12 testers, 14 days)** before launch | org accounts avoid that testing gate in some cases; confirm current policy |

## Recommendation (given the "not personally identifiable" preference)
**Form a legal entity (e.g. a single-member LLC) and enroll as an organization on both
stores**, using:
- an entity legal name you're comfortable showing publicly as the seller/developer,
- a **role-based email** (e.g. `support@thepeoplesbudget.us`), not a personal address,
- the project **domain** for the required website,
- the entity's registered address (consider a registered-agent/business address rather
  than a home address where lawful),
- a **D‑U‑N‑S number** registered to the entity.

This keeps your personal name off the public listings. It does **not** make you
anonymous to Apple/Google, your payment processor, or tax authorities — that's
unavoidable.

If you launch web-only for now, **no store account is needed** and this decision can
wait — but start entity + D‑U‑N‑S early because they have lead time.

## Sequence when you're ready for native
1. Decide entity type; form the LLC/corp (or consult a professional).
2. Get a **D‑U‑N‑S number** for the entity (free; allow lead time).
3. Set up role-based email + ensure the domain website is live.
4. Enroll **as an organization** on Apple ($99/yr) and Google ($25).
5. Protect signing keys (see security-incident-runbook + native P3 items).

## Do not
- Do not enroll individually if you don't want your legal name public.
- Do not use a personal Gmail as the public support address.
- Do not promise users "we're fully anonymous" — the store listing will show the seller/entity.

*Sources: Apple Developer "Become a member" / D‑U‑N‑S help; Google Play "Verify your
developer identity" + the Play "About the developer" transparency policy. Re-check both
before enrolling, as requirements change.*
