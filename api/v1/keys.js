import { getJSON, setJSON, incr, expire } from "../../lib/redis.js";
import { mintKey, PLANS } from "../../lib/auth.js";
import { randomBytes } from "node:crypto";

export default async function handler(req, res) {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("content-type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    res.statusCode = 405;
    return res.end(JSON.stringify({ ok: false, error: "POST only", plans: Object.keys(PLANS) }));
  }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  const email = String(body.email || "").trim().toLowerCase();
  const plan = String(body.plan || "trial").toLowerCase();

  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ ok: false, error: "valid email chahiye" }));
  }
  if (!PLANS[plan]) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ ok: false, error: "unknown plan", plans: Object.keys(PLANS) }));
  }

  // trial: ek email pe sirf ek baar
  if (plan === "trial") {
    const seen = await getJSON(`trial:${email}`);
    if (seen) {
      res.statusCode = 429;
      return res.end(JSON.stringify({ ok: false, error: "is email pe trial already le liya hai" }));
    }
    await setJSON(`trial:${email}`, { at: Date.now() });
    const { key, rec } = await mintKey({ plan, email });
    return res.end(JSON.stringify({
      ok: true,
      key,
      plan,
      expires: rec.expires,
      daily: rec.daily,
      note: "24 ghante ke liye valid. Dashboard pe key daal ke chalao.",
    }));
  }

  // paid plans: pending request
  const ref = "req_" + randomBytes(6).toString("hex");
  await setJSON(`pending:${ref}`, { ref, email, plan, at: Date.now() });
  await incr(`pendingcount`).then(() => expire("pendingcount", 86400 * 30)).catch(() => {});
  res.end(JSON.stringify({
    ok: true,
    status: "pending",
    ref,
    plan,
    price: PLANS[plan].price,
    note: "Payment ke baad admin approve karega. Apna ref id sambhal ke rakho.",
  }));
}
