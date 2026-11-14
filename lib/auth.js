import { randomBytes } from "node:crypto";
import { get, getJSON, setJSON, del, incr, expire } from "./redis.js";

// presets sirf shortcut hain. custom hours/daily bhi chalega.
export const DURATIONS = {
  "1h": { label: "1 hour",  hours: 1,    daily: 60 },
  "1d": { label: "1 day",   hours: 24,   daily: 200 },
  "3d": { label: "3 days",  hours: 72,   daily: 250 },
  "1w": { label: "1 week",  hours: 168,  daily: 300 },
  "1m": { label: "1 month", hours: 720,  daily: 500 },
  "1y": { label: "1 year",  hours: 8760, daily: 1000 },
};

export const PLANS = DURATIONS;

const HOURS_MIN = 0.05;      // ~3 minute
const HOURS_MAX = 8760 * 2;  // 2 saal
const DAILY_MAX = 100000;

export const newKey = () => "sb_live_" + randomBytes(18).toString("hex");
export const today = () => new Date().toISOString().slice(0, 10);

export function humanHours(h) {
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 24) return `${Math.round(h * 10) / 10} hour`;
  return `${Math.round(h / 24)} day`;
}

// hours/daily blank ho to preset default. warna custom.
export function resolveTerm({ plan, hours, daily } = {}) {
  const preset = plan && DURATIONS[plan] ? DURATIONS[plan] : null;

  let h = Number(hours);
  if (!Number.isFinite(h) || h <= 0) h = preset ? preset.hours : 24;
  h = Math.min(Math.max(h, HOURS_MIN), HOURS_MAX);

  let d = parseInt(daily, 10);
  if (!Number.isFinite(d) || d <= 0) d = preset ? preset.daily : 200;
  d = Math.min(Math.max(d, 1), DAILY_MAX);

  const isPreset = !!preset && h === preset.hours && d === preset.daily;
  return {
    plan: isPreset ? plan : "custom",
    hours: h,
    daily: d,
    label: isPreset ? preset.label : `${humanHours(h)} (custom)`,
  };
}

export async function mintKey({ plan, hours, daily, name }) {
  const t = resolveTerm({ plan, hours, daily });
  const key = newKey();
  const rec = {
    plan: t.plan,
    hours: t.hours,
    label: t.label,
    name: String(name || "").trim().slice(0, 40) || null,
    createdAt: Date.now(),
    expires: Date.now() + t.hours * 3600e3,
    daily: t.daily,
    revoked: false,
    total: 0,
  };
  await setJSON(`key:${key}`, rec);
  return { key, rec, term: t };
}

export async function authenticate(key) {
  if (!key) return { ok: false, code: 401, error: "missing ?key=" };
  const rec = await getJSON(`key:${key}`);
  if (!rec) return { ok: false, code: 401, error: "invalid api key" };
  if (rec.revoked) return { ok: false, code: 403, error: "key revoked" };
  if (rec.expires && Date.now() > rec.expires) {
    return { ok: false, code: 403, error: "key expired", plan: rec.plan };
  }
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
