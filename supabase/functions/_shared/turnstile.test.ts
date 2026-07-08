// Mocked-Siteverify tests for the fail-closed Turnstile helper (§7).
// Run with:  deno test supabase/functions/_shared/turnstile.test.ts
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { verifyTurnstile, parseHostnames } from "./turnstile.ts";

const spyFetch = () => {
  let calls = 0;
  const fn = ((_u: string | URL | Request, _i?: RequestInit) => {
    calls++;
    return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
  }) as unknown as typeof fetch;
  return { fn, calls: () => calls };
};
const respFetch = (status: number, bodyObj: unknown, raw?: string) =>
  ((_u: string | URL | Request, _i?: RequestInit) =>
    Promise.resolve(new Response(raw ?? JSON.stringify(bodyObj), { status }))) as unknown as typeof fetch;
const throwFetch = () => ((_u: string | URL | Request) => { throw new Error("net"); }) as unknown as typeof fetch;

Deno.test("missing token → missing, no network", async () => {
  const s = spyFetch();
  assertEquals((await verifyTurnstile(undefined, "sec", { fetchImpl: s.fn })).reason, "missing");
  assertEquals(s.calls(), 0);
});
Deno.test("empty token → missing, no network", async () => {
  const s = spyFetch();
  assertEquals((await verifyTurnstile("", "sec", { fetchImpl: s.fn })).reason, "missing");
  assertEquals(s.calls(), 0);
});
Deno.test("token > 2048 → missing, no network", async () => {
  const s = spyFetch();
  assertEquals((await verifyTurnstile("x".repeat(2049), "sec", { fetchImpl: s.fn })).reason, "missing");
  assertEquals(s.calls(), 0);
});
Deno.test("missing secret → unavailable, no network", async () => {
  const s = spyFetch();
  assertEquals((await verifyTurnstile("tok", "", { fetchImpl: s.fn })).reason, "unavailable");
  assertEquals(s.calls(), 0);
});
Deno.test("network error → unavailable", async () => {
  assertEquals((await verifyTurnstile("tok", "sec", { fetchImpl: throwFetch() })).reason, "unavailable");
});
Deno.test("non-200 → unavailable", async () => {
  assertEquals((await verifyTurnstile("tok", "sec", { fetchImpl: respFetch(502, {}) })).reason, "unavailable");
});
Deno.test("malformed JSON → unavailable", async () => {
  assertEquals((await verifyTurnstile("tok", "sec", { fetchImpl: respFetch(200, null, "<<x") })).reason, "unavailable");
});
Deno.test("malformed shape (no boolean success) → unavailable", async () => {
  assertEquals((await verifyTurnstile("tok", "sec", { fetchImpl: respFetch(200, { foo: 1 }) })).reason, "unavailable");
});
Deno.test("success:false → failed", async () => {
  assertEquals((await verifyTurnstile("tok", "sec", { fetchImpl: respFetch(200, { success: false }) })).reason, "failed");
});
Deno.test("success:true, hostname disabled → ok", async () => {
  assertEquals((await verifyTurnstile("tok", "sec", { fetchImpl: respFetch(200, { success: true }) })).ok, true);
});
Deno.test("hostname match → ok", async () => {
  const r = await verifyTurnstile("tok", "sec", { fetchImpl: respFetch(200, { success: true, hostname: "peoples-budget.vercel.app" }), expectedHostnames: ["peoples-budget.vercel.app"] });
  assertEquals(r.ok, true);
});
Deno.test("hostname mismatch → failed", async () => {
  const r = await verifyTurnstile("tok", "sec", { fetchImpl: respFetch(200, { success: true, hostname: "evil.example" }), expectedHostnames: ["peoples-budget.vercel.app"] });
  assertEquals(r, { ok: false, reason: "failed" });
});
Deno.test("hostname missing when configured → unavailable", async () => {
  const r = await verifyTurnstile("tok", "sec", { fetchImpl: respFetch(200, { success: true }), expectedHostnames: ["peoples-budget.vercel.app"] });
  assertEquals(r.ok, false);
});
Deno.test("parseHostnames trims and ignores empties", () => {
  assertEquals(parseHostnames("  a.com , ,b.com,,"), ["a.com", "b.com"]);
  assertEquals(parseHostnames(undefined), []);
  assertEquals(parseHostnames(""), []);
});
