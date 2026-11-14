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

function page(res, code, url, j) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const rows = (j.detail || []).flatMap((r) => r.results || [])
    .map((r) => `<div class="l"><span>${esc(r.service)}</span><span class="${r.ok ? "ok" : "no"}">${r.ok ? "ok" : "fail " + (r.status || "")}</span></div>`)
    .join("");

  const body = j.ok
    ? `<h1>${j.accepted} accepted <span>/ ${j.failed} fail</span></h1>
       <p class="n">${j.services} services · quota ${j.quota.remaining} bacha · ${j.tookMs}ms</p>
       ${rows}
       <p class="n" style="margin-top:18px"><a href="${esc(url)}">↻ phir bhejo</a></p>`
    : `<h1>${esc(j.error || "fail")}</h1>`;

  res.statusCode = code;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>SMSBomb · result</title>
<style>
:root{--bg:#05070c;--panel:#0a1018;--line:#132033;--fg:#e6eefb;--dim:#7e93ad;--a2:#22e0ff;--bad:#ff5c7a}
body{margin:0;padding:26px 18px;background:radial-gradient(700px 400px at 50% -10%,rgba(47,155,255,.16),transparent 70%),var(--bg);color:var(--fg);font-family:Inter,system-ui,sans-serif}
h1{font-size:24px;letter-spacing:-.03em;margin:0 0 6px}h1 span{color:var(--dim);font-size:15px;font-weight:400}
.n{color:var(--dim);font-size:12px;margin:0 0 16px;font-family:'JetBrains Mono',monospace}
a{color:var(--a2)}
.l{display:flex;justify-content:space-between;background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:6px 10px;margin-bottom:4px;font-family:'JetBrains Mono',monospace;font-size:12px}
.ok{color:var(--a2)}.no{color:var(--bad)}
</style></head><body>${body}</body></html>`);
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    for (const k in CORS) res.setHeader(k, CORS[k]);
    return res.end();
  }

  const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
  const wantsHtml = /text\/html/.test(String(req.headers.accept || "")) && url.searchParams.get("format") !== "json";
  const send = (code, payload) => wantsHtml ? page(res, code, req.url, payload) : reply(res, code, payload);

  const input = Object.fromEntries(url.searchParams);
  if (req.method === "POST") {
    let raw = req.body;
    if (typeof raw === "string") { try { raw = JSON.parse(raw); } catch { raw = {}; } }
    Object.assign(input, raw || {});
  }

  const auth = await authenticate(input.key);
  if (!auth.ok) return send(auth.code, { ok: false, error: auth.error });

  const cc = String(input.cc || "91").replace(/\D/g, "") || "91";
  const target = parseTarget(input.number, cc);
  if (!target) return send(400, { ok: false, error: "valid number chahiye, e.g. ?number=9876543210" });

  const rawCount = parseInt(input.count, 10) || 1;
  const count = Math.min(Math.max(rawCount, 1), 5);

  const disabled = await disabledSet();
  let picked = SERVICES.filter((s) => !disabled.has(s.name));

  if (input.services && input.services !== "all") {
    const want = input.services.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
    picked = picked.filter((s) => want.includes(s.name));
    if (!picked.length) {
      return send(400, { ok: false, error: "koi service match nahi hui", available: SERVICES.map((s) => s.name) });
    }
  }
  if (!picked.length) return send(503, { ok: false, error: "abhi koi service live nahi, thodi der baad try karo" });

  // quota validation ke BAAD — galat request pe quota nahi jalega.
  const quota = await consume(input.key, auth.rec);
  if (!quota.ok) return send(429, { ok: false, error: quota.error, used: quota.used, limit: quota.limit });

  const out = await blast({ services: picked, target, count });

  return send(200, {
    ok: true,
    target: target.e164,
    services: picked.length,
    skippedDisabled: disabled.size,
    rounds: count,
    countClamped: rawCount !== count,
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
