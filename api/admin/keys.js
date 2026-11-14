import { getJSON, setJSON, scanKeys } from "../../lib/redis.js";
import { mintKey, revoke, PLANS } from "../../lib/auth.js";

export default async function handler(req, res) {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("content-type", "application/json; charset=utf-8");

  const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
  if (url.searchParams.get("secret") !== process.env.ADMIN_SECRET) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ ok: false, error: "bad secret" }));
  }

  if (req.method === "GET") {
    const pendingKeys = await scanKeys("pending:*");
    const pending = [];
    for (const k of pendingKeys) {
      const p = await getJSON(k);
      if (p) pending.push(p);
    }
    const keyNames = await scanKeys("key:*");
    const keys = [];
    for (const k of keyNames) {
      const r = await getJSON(k);
      if (r) keys.push({ key: k.slice(4), ...r });
    }
    res.end(JSON.stringify({ pending, keys, plans: PLANS }, null, 2));
    return;
  }

  if (req.method === "DELETE") {
    const key = url.searchParams.get("key");
    if (!key) { res.statusCode = 400; return res.end(JSON.stringify({ ok: false, error: "?key= chahiye" })); }
    const done = await revoke(key);
    return res.end(JSON.stringify({ ok: done }));
  }

  if (req.method === "POST") {
    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
    body = body || {};
    const plan = String(body.plan || "monthly").toLowerCase();
    if (!PLANS[plan]) { res.statusCode = 400; return res.end(JSON.stringify({ ok: false, error: "unknown plan" })); }
    if (body.ref) await setJSON(`pending:${body.ref}`, { ...(await getJSON(`pending:${body.ref}`) || {}), approved: true });
    const { key, rec } = await mintKey({ plan, email: body.email, txn: body.txn });
    return res.end(JSON.stringify({ ok: true, key, plan, expires: rec.expires, daily: rec.daily }));
  }

  res.statusCode = 405;
  res.end(JSON.stringify({ ok: false }));
}
