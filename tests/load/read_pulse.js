// Sustained read load against get_pulse (STAGING ONLY).
import http from "k6/http";
import { check } from "k6";

const URL = __ENV.PB_URL;      // https://<staging-ref>.supabase.co
const ANON = __ENV.PB_ANON;    // anon/publishable key (never service-role)

export const options = {
  stages: [
    { duration: "1m", target: 10 },
    { duration: "3m", target: 100 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<400"],
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  if (!URL || !ANON) throw new Error("Set PB_URL and PB_ANON env vars (staging).");
  const res = http.post(
    `${URL}/rest/v1/rpc/get_pulse`,
    JSON.stringify({ p_dim: "all", p_region: null, p_bracket: null }),
    { headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` } }
  );
  check(res, { "status 200": (r) => r.status === 200 });
}
