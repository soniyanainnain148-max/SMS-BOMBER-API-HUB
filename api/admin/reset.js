import { del, scanKeys, srem } from "../../lib/redis.js";

export default async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
  if (url.searchParams.get("secret") !== process.env.ADMIN_SECRET) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ ok: false, error: "bad secret" }));
  }
  const fails = await scanKeys("fail:*");
  for (const k of fails) await del(k).catch(() => {});
  await del("svc:disabled").catch(() => {});
  res.end(JSON.stringify({ ok: true, cleared: fails.length + 1 }));
}
