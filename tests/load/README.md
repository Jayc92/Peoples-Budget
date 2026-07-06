# Load-test scripts (staging only)

k6 scripts for the capacity tests in `docs/load-test-plan.md`.

**Never run against production.** Point these at a **staging** Supabase project.
Credentials come from environment variables — do not hardcode keys.

```bash
# staging values (anon/publishable key only — never the service-role key)
export PB_URL="https://<staging-ref>.supabase.co"
export PB_ANON="sb_publishable_xxx"

k6 run tests/load/read_pulse.js     # sustained aggregate reads
k6 run tests/load/submit_vote.js    # sustained writes (unique client_ids)
```

Install k6: https://k6.io/docs/get-started/installation/
