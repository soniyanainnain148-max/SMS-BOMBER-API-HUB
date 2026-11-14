import { authenticate, usage } from "../../lib/auth.js";

export default async function handler(req, res) {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("content-type", "application/json; charset=utf-8");

  const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
  const auth = await authenticate(url.searchParams.get("key"));
  if (!auth.ok) {
    res.statusCode = auth.code;
    return res.end(JSON.stringify({ ok: false, error: auth.error }));
  }

  const u = await usage(url.searchParams.get("key"), auth.rec);
  res.end(JSON.stringify({
    ok: true,
    plan: auth.rec.plan,
    createdAt: auth.rec.createdAt,
    expires: auth.rec.expires || null,
    lifetime: !auth.rec.expires,
    quota: u,
  }));
}
