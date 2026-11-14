import { get, getJSON, scanKeys } from "../../lib/redis.js";
import { mintKey, revoke, DURATIONS } from "../../lib/auth.js";
import { buildLinks } from "../../lib/links.js";

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
    const day = new Date().toISOString().slice(0, 10);
    const keys = [];
    for (const k of names) {
      const r = await getJSON(k);
      if (!r) continue;
      const id = k.slice(4);
      const used = Number(await get(`rl:${id}:${day}`)) || 0;
      const total = Number(await get(`total:${id}`)) || 0;
      keys.push({ key: id, ...r, used, total, url: buildLinks(req, id, {}).endpoint });
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

    const { key, rec, term } = await mintKey({
      plan: body.plan,
      hours: body.hours,
      daily: body.daily,
      name: body.name,
    });

    const links = buildLinks(req, key, { number: body.number, count: body.count || 1 });

    return reply(res, 200, {
      ok: true, key, name: rec.name, plan: term.plan, label: term.label,
      hours: term.hours, daily: term.daily, expires: rec.expires,
      url: links.url, endpoint: links.endpoint, me: links.me,
    });
  }

  return reply(res, 405, { ok: false });
}
