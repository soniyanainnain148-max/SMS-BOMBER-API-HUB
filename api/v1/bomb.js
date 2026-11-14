import { SERVICES } from "../../lib/services.js";
import { authenticate, consume } from "../../lib/auth.js";
import { disabledSet, parseTarget, blast } from "../../lib/engine.js";
import { buildLinks } from "../../lib/links.js";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
};

function reply(res, code, payload) {
  res.statusCode = code;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  for (const k in CORS) res.setHeader(k, CORS[k]);
  res.end(JSON.stringify(payload, null, 2));
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    for (const k in CORS) res.setHeader(k, CORS[k]);
    return res.end();
  }

  const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
  const input = Object.fromEntries(url.searchParams);
  if (req.method === "POST") {
    let raw = req.body;
    if (typeof raw === "string") { try { raw = JSON.parse(raw); } catch { raw = {}; } }
    Object.assign(input, raw || {});
  }

  const auth = await authenticate(input.key);
  if (!auth.ok) return reply(res, auth.code, { ok: false, error: auth.error });

  const cc = String(input.cc || "91").replace(/\D/g, "") || "91";
  const target = parseTarget(input.number, cc);
  if (!target) return reply(res, 400, { ok: false, error: "valid number chahiye, e.g. ?number=9876543210" });

  const rawCount = parseInt(input.count, 10) || 1;
  const count = Math.min(Math.max(rawCount, 1), 5);

  const disabled = await disabledSet();
  let picked = SERVICES.filter((s) => !disabled.has(s.name));

  if (input.services && input.services !== "all") {
    const want = input.services.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
    picked = picked.filter((s) => want.includes(s.name));
    if (!picked.length) {
      return reply(res, 400, { ok: false, error: "koi service match nahi hui", available: SERVICES.map((s) => s.name) });
    }
  }
  if (!picked.length) return reply(res, 503, { ok: false, error: "abhi koi service live nahi, thodi der baad try karo" });

  const quota = await consume(input.key, auth.rec);
  if (!quota.ok) return reply(res, 429, { ok: false, error: quota.error, used: quota.used, limit: quota.limit });

  const out = await blast({ services: picked, target, count });

  return reply(res, 200, {
    ok: true,
    target: target.e164,
    services: picked.length,
    skippedDisabled: disabled.size,
    rounds: count,
    requested: picked.length * count,
    accepted: out.accepted,
    failed: out.failed,
    tookMs: out.tookMs,
    quota: { used: quota.used, limit: quota.limit, remaining: Math.max(quota.limit - quota.used, 0) },
    links: buildLinks(req, input.key, { number: target.digits, count }),
    note: "accepted = gateway ne request li (2xx/3xx). Delivery guarantee nahi.",
    detail: out.rounds,
  });
}
