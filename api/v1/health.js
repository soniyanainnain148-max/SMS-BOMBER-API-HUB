import { SERVICES } from "../../lib/services.js";
import { fire } from "../../lib/engine.js";
import { srem } from "../../lib/redis.js";

export const config = { maxDuration: 30 };

const bucket = (s) =>
  s === 0 || s >= 500 ? "down"
  : s === 401 || s === 403 || s === 429 ? "blocked"
  : s === 404 || s === 405 || s === 410 ? "gone"
  : s >= 400 ? "badreq"
  : "ok";

export default async function handler(req, res) {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("content-type", "application/json; charset=utf-8");

  const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
  const digits = (url.searchParams.get("number") || "9999999999").replace(/\D/g, "").slice(-10);
  const test = "+91" + digits;
  const results = [];
  let cursor = 0;

  await Promise.all(
    Array.from({ length: 12 }, async () => {
      while (cursor < SERVICES.length) {
        const svc = SERVICES[cursor++];
        const r = await fire(svc, test, digits);
        if (r.ok) await srem("svc:disabled", svc.name).catch(() => {});
        results.push({ service: r.service, status: r.status, ms: r.ms, kind: bucket(r.status) });
      }
    })
  );

  const count = (k) => results.filter((r) => r.kind === k).length;
  const summary = {
    ok: count("ok"), blocked: count("blocked"), gone: count("gone"),
    badreq: count("badreq"), down: count("down"),
  };

  res.end(JSON.stringify({
    checkedAt: new Date().toISOString(),
    testedWith: test,
    total: results.length,
    summary,
    passRate: Math.round((summary.ok / results.length) * 100) + "%",
    note: "?number= apna number de — 59 SMS aa jayenge. 400 = payload galat, service zinda hai.",
    results: results.sort((a, b) => a.service.localeCompare(b.service)),
  }));
}
