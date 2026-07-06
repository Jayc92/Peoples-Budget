// Sustained write load against submit_vote (STAGING ONLY).
// Uses unique client_ids and region 'LOADTEST' so rows are easy to purge.
import http from "k6/http";
import { check } from "k6";
import { uuidv4 } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";

const URL = __ENV.PB_URL;
const ANON = __ENV.PB_ANON;

export const options = {
  stages: [
    { duration: "1m", target: 10 },
    { duration: "3m", target: 100 },
    { duration: "1m", target: 0 },
  ],
  thresholds: { http_req_duration: ["p(95)<600"] },
};

// A valid complete allocation (all keys, zeros included) — matches server validation.
const ALLOC = {
  federal: { social_security:50, defense:49, education:1, medicare_medicaid:0, debt_interest:0, income_security:0, veterans:0, transportation:0, housing:0, homeland:0, justice:0, environment:0, foreign_aid:0, general_gov:0, science:0, agriculture:0 },
  state: { st_health:50, st_k12:49, st_gov:1, st_higher:0, st_transport:0, st_safety:0, st_environment:0, st_welfare:0, st_corrections:0 },
  county: { co_schools:50, co_safety:49, co_admin:1, co_health:0, co_water:0, co_roads:0, co_social:0, co_parks:0 },
};

export default function () {
  if (!URL || !ANON) throw new Error("Set PB_URL and PB_ANON env vars (staging).");
  const res = http.post(
    `${URL}/rest/v1/rpc/submit_vote`,
    JSON.stringify({ p_client_id: uuidv4(), p_region: "LOADTEST", p_bracket: 3, p_filing: "single", p_alloc: ALLOC }),
    { headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` } }
  );
  // 200 = accepted; a rate_limited/validation rejection is also a valid, handled outcome.
  check(res, { "not a server error": (r) => r.status < 500 });
}
