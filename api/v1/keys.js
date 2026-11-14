import { mintKey, DURATIONS } from "../../lib/auth.js";
import { buildLinks } from "../../lib/links.js";

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

  const { key, rec, term } = await mintKey({
    plan: body.plan,
    hours: body.hours,
    daily: body.daily,
    name: body.name,
  });

  const links = buildLinks(req, key, { number: body.number, count: body.count || 1 });

  return reply(res, 200, {
    ok: true,
    key,
    name: rec.name,
    plan: term.plan,
    label: term.label,
    hours: term.hours,
    daily: term.daily,
    expires: rec.expires,
    url: links.url,
    endpoint: links.endpoint,
    me: links.me,
    note: "url me key already lagi hai — browser me seedha kholo.",
  });
}
