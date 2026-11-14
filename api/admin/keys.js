import { getJSON, scanKeys } from "../../lib/redis.js";
import { mintKey, revoke, DURATIONS } from "../../lib/auth.js";

function reply(res, code, payload) {
  res.statusCode = code;
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(payload, null, 2));
}

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
  if (url.searchParams.get("secret") !== process.env.ADMIN_SECRET) {
    return reply(res, 401, { ok: false, error: "bad secret" });
  }

  if (req.method === "GET") {
    const names = await scanKeys("key:*");
    const keys = [];
    for (const k of names) {
      const r = await getJSON(k);
      if (r) keys.push({ key: k.slice(4), ...r });
    }
    keys.sort((a, b) => b.createdAt - a.createdAt);
    return reply(res, 200, { ok: true, keys, durations: DURATIONS });
  }

  if (req.method === "DELETE") {
    const key = url.searchParams.get("key");
    if (!key) return reply(res, 400, { ok: false, error: "?key= chahiye" });
    return reply(res, 200, { ok: await revoke(key) });
  }

  if (req.method === "POST") {
    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
    body = body || {};
    const plan = String(body.plan || "1d").toLowerCase();
    if (!DURATIONS[plan]) return reply(res, 400, { ok: false, error: "unknown duration" });

    const { key, rec } = await mintKey({ plan, name: body.name });
    return reply(res, 200, {
      ok: true, key, name: rec.name, plan,
      label: DURATIONS[plan].label, expires: rec.expires, daily: rec.daily,
    });
  }

  return reply(res, 405, { ok: false });
}
