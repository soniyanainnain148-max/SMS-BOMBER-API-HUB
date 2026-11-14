import { del, scanKeys } from "../../lib/redis.js";

export default async function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
  if (url.searchParams.get("secret") !== process.env.ADMIN_SECRET) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ ok: false, error: "bad secret" }));
  }

  let cleared = 0;
  for (const pat of ["fail:*", "hfail:*"]) {
    for (const k of await scanKeys(pat)) { await del(k).catch(() => {}); cleared++; }
  }
  await del("svc:disabled").catch(() => {});
  await del("health:lock").catch(() => {});

  if (url.searchParams.get("usage") === "1") {
    for (const k of await scanKeys("rl:*")) { await del(k).catch(() => {}); cleared++; }
  }

  res.end(JSON.stringify({ ok: true, cleared: cleared + 2 }));
}
