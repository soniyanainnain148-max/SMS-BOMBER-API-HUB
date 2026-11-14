import { SERVICES } from "../../lib/services.js";
import { fire } from "../../lib/engine.js";
import { srem } from "../../lib/redis.js";

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("content-type", "application/json; charset=utf-8");

  const test = "+919999999999";
  const results = [];
  let cursor = 0;

  await Promise.all(
    Array.from({ length: 12 }, async () => {
      while (cursor < SERVICES.length) {
        const svc = SERVICES[cursor++];
        const r = await fire(svc, test, "9999999999");
        if (r.ok) await srem("svc:disabled", svc.name).catch(() => {});
        results.push({ service: r.service, ok: r.ok, status: r.status, ms: r.ms });
      }
    })
  );

  results.sort((a, b) => a.service.localeCompare(b.service));
  const ok = results.filter((r) => r.ok).length;
  res.end(JSON.stringify({
    checkedAt: new Date().toISOString(),
    healthy: ok,
    total: results.length,
    passRate: Math.round((ok / results.length) * 100) + "%",
    results,
  }));
}
