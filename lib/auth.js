import { randomBytes } from "node:crypto";
import { get, getJSON, setJSON, del, incr, expire } from "./redis.js";

export const PLANS = {
  free:     { label: "Free",     ttlDays: 30, daily: 100,  price: 0 },
  trial:    { label: "Trial",    ttlDays: 1,  daily: 20,   price: 0 },
  weekly:   { label: "Weekly",   ttlDays: 7,  daily: 100,  price: 99 },
  monthly:  { label: "Monthly",  ttlDays: 30, daily: 300,  price: 249 },
  lifetime: { label: "Lifetime", ttlDays: 0,  daily: 1000, price: 999 },
};

export const newKey = () => "sb_live_" + randomBytes(18).toString("hex");

export const today = () => new Date().toISOString().slice(0, 10);

export async function mintKey({ plan, email, txn }) {
  const cfg = PLANS[plan];
  if (!cfg) throw new Error("unknown plan");
  const key = newKey();
  const rec = {
    plan,
    email: email || null,
    txn: txn || null,
    createdAt: Date.now(),
    expires: cfg.ttlDays ? Date.now() + cfg.ttlDays * 864e5 : 0,
    daily: cfg.daily,
    revoked: false,
    total: 0,
  };
  await setJSON(`key:${key}`, rec);
  return { key, rec };
}

export async function authenticate(key) {
  if (!key) return { ok: false, code: 401, error: "missing ?key=" };
  const rec = await getJSON(`key:${key}`);
  if (!rec) return { ok: false, code: 401, error: "invalid api key" };
  if (rec.revoked) return { ok: false, code: 403, error: "key revoked" };
  if (rec.expires && Date.now() > rec.expires) return { ok: false, code: 403, error: "key expired", plan: rec.plan };
  return { ok: true, rec };
}

export async function consume(key, rec) {
  const bucket = `rl:${key}:${today()}`;
  const used = Number(await incr(bucket)) || 1;
  if (used === 1) await expire(bucket, 90000);
  if (used > rec.daily) {
    return { ok: false, code: 429, error: `daily limit reached (${rec.daily}/day)`, used, limit: rec.daily };
  }
  await incr(`total:${key}`);
  return { ok: true, used, limit: rec.daily };
}

export async function usage(key, rec) {
  const used = Number(await get(`rl:${key}:${today()}`)) || 0;
  const total = Number(await get(`total:${key}`)) || 0;
  return { used, limit: rec.daily, remaining: Math.max(rec.daily - used, 0), total };
}

export async function revoke(key) {
  const rec = await getJSON(`key:${key}`);
  if (!rec) return false;
  rec.revoked = true;
  await setJSON(`key:${key}`, rec);
  await del(`rl:${key}:${today()}`);
  return true;
                      }
