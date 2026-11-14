import { getJSON, setJSON } from "../../lib/redis.js";
import { mintKey, PLANS } from "../../lib/auth.js";
import { randomBytes } from "node:crypto";

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
    return reply(res, 405, { ok: false, error: "POST only", plans: Object.keys(PLANS) });
  }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  const plan = String(body.plan || "free").toLowerCase();
  const email = String(body.email || "").trim().toLowerCase();

  if (!PLANS[plan]) return reply(res, 400, { ok: false, error: "unknown plan", plans: Object.keys(PLANS) });

  // free: koi email nahi chahiye, seedha key
  if (plan === "free") {
    const { key, rec } = await mintKey({ plan });
    return reply(res, 200, {
      ok: true, key, plan,
      expires: rec.expires,
      daily: rec.daily,
      note: "30 din / 100 calls per din. Key sambhal ke rakho.",
    });
  }

  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) {
    return reply(res, 400, { ok: false, error: "is plan ke liye valid email chahiye" });
  }

  if (plan === "trial") {
    if (await getJSON(`trial:${email}`)) {
      return reply(res, 429, { ok: false, error: "is email pe trial already le liya hai — free key lo" });
    }
    await setJSON(`trial:${email}`, { at: Date.now() });
    const { key, rec } = await mintKey({ plan, email });
    return reply(res, 200, { ok: true, key, plan, expires: rec.expires, daily: rec.daily });
  }

  // paid plans: sirf pending request. paisa site pe nahi, Telegram pe.
  const ref = "req_" + randomBytes(6).toString("hex");
  await setJSON(`pending:${ref}`, { ref, email, plan, at: Date.now() });
  return reply(res, 200, {
    ok: true, status: "pending", ref, plan,
    note: "ref id sambhalo. Telegram pe ref bhejo.",
  });
}
