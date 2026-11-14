import { mintKey, DURATIONS } from "../../lib/auth.js";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST,OPTIONS",
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
  if (req.method !== "POST") {
    return reply(res, 405, { ok: false, error: "POST only", durations: Object.keys(DURATIONS) });
  }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  const plan = String(body.plan || "1d").toLowerCase();
  if (!DURATIONS[plan]) {
    return reply(res, 400, { ok: false, error: "unknown duration", durations: Object.keys(DURATIONS) });
  }

  const { key, rec } = await mintKey({ plan, name: body.name });

  return reply(res, 200, {
    ok: true,
    key,
    name: rec.name,
    plan,
    label: DURATIONS[plan].label,
    expires: rec.expires,
    daily: rec.daily,
    note: `key ${DURATIONS[plan].label} ke liye valid hai, phir khud expire ho jayegi.`,
  });
}
