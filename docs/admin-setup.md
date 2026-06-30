# Admin Setup — The People's Budget

The admin page (`/admin.html`) manages live events. Access is protected by a
**shared secret** that is verified server-side against a salted **bcrypt** hash.

> **Important:** This is shared-secret authentication, **not** Supabase Auth.
> See "Limitations & future work" at the end.

The database stores **only the bcrypt hash** — never the plaintext password.
You set and rotate the password directly in the Supabase SQL Editor, so the
real password never appears in GitHub, source files, or chat.

---

## 1. Set or rotate the admin password

Open **Supabase → SQL Editor** and run the template below, replacing only the
placeholder text inside the quotes. Everything else stays as-is.

```sql
-- Run in the Supabase SQL Editor (service-role context). Do NOT commit this with a real password.
insert into public.admin_config (key, value)
values (
  'admin_secret_hash',
  extensions.crypt('REPLACE_WITH_A_STRONG_PASSWORD', extensions.gen_salt('bf', 10))
)
on conflict (key) do update set value = excluded.value;
```

- `gen_salt('bf', 10)` generates a bcrypt salt at cost factor 10.
- `crypt(...)` returns the salted hash; **only the hash is stored**.
- `on conflict ... do update` safely **replaces** any previous hash, so the same
  statement works for the first setup and for every later rotation.
- Use a long, random password (a passphrase or 20+ random characters).

After running it, **clear the statement from the editor** so the plaintext isn't
left on screen. The plaintext is never needed again — only you keep it.

---

## 2. Verify login

1. Visit `https://peoples-budget.vercel.app/admin.html`.
2. Enter the password and select **Unlock**.
3. On success the event manager appears. On failure you'll see
   "Incorrect password."

The secret is held only in the browser tab's `sessionStorage` for the session.

## 3. Log out

Use the **Log out** button (top-right). It clears the stored session secret
immediately. Closing the tab also ends the session.

---

## 4. How throttling behaves

- Failed logins are recorded server-side in `public.admin_login_attempts`.
- If there are **10 or more failed attempts within 15 minutes**, `admin_check`
  raises `locked_out` and **all** logins are refused until the window clears.
- Successful logins are not counted toward the lockout.
- Throttling is **global** (there is a single admin), so a flood of bad attempts
  can temporarily lock you out too — see recovery below.

> **Known limitation (denial-of-service):** because throttling is global, *any*
> anonymous caller can intentionally trigger the temporary lockout by sending a
> burst of failed `admin_check` calls — locking out the real admin for the
> window. This is an accepted limitation of shared-secret auth in this milestone,
> **not** a production-grade access-control system. The long-term fix is to move
> admin access to **Supabase Auth**, or to a **server-side Edge Function**
> protected by IP-aware rate limiting and/or a challenge such as Cloudflare
> Turnstile, so attempts can be limited per-identity instead of globally.

## 5. Recover if you lock yourself out

Either:

- **Wait ~15 minutes** for the failed-attempt window to clear, or
- Clear the attempts immediately in the Supabase SQL Editor:

```sql
delete from public.admin_login_attempts;
```

If you've also forgotten the password, simply set a new one with the template in
Section 1 — and clear attempts with the statement above so you can log in at once.

---

## 6. Where admin actions are recorded

Every mutation is logged to **`public.admin_audit`** — `create`, `update`,
`activate`, `deactivate`, and `delete` — with a timestamp, the affected event id,
and minimal detail (title/tier/category/active). **Passwords are never recorded.**

Review recent admin activity:

```sql
select at, action, event_id, detail
from public.admin_audit
order by at desc
limit 50;
```

`admin_config`, `admin_audit`, and `admin_login_attempts` are not readable by the
public (`anon`) role — only through the security-defined admin functions.

---

## 7. Limitations & future work

This is **shared-secret authentication**. Anyone who has the password has full
admin access; there are no per-user accounts, and the throttle is global.

Recommended hardening for a future pass:

- Migrate to **Supabase Auth** with one or more **allowlisted admin user IDs**.
- Perform **role checks server-side** (e.g. an `is_admin(auth.uid())` gate inside
  the RPCs) instead of a shared secret.
- Add **MFA** for the admin account(s).
- Consider per-identity rate limiting to remove the global-lockout DoS vector.

Until then: use a strong, unique password, rotate it if it's ever exposed, and
keep the Supabase project credentials private.
