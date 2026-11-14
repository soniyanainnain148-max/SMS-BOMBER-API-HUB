const R_URL = process.env.UPSTASH_REDIS_REST_URL;
const R_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function cmd(...args) {
  if (!R_URL || !R_TOKEN) throw new Error("UPSTASH env vars missing");
  const path = args.map((a) => encodeURIComponent(String(a))).join("/");
  const r = await fetch(`${R_URL}/${path}`, {
    headers: { authorization: `Bearer ${R_TOKEN}` },
    cache: "no-store",
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

export const get = (k) => cmd("GET", k);
export const set = (k, v, ...rest) => cmd("SET", k, v, ...rest);
export const del = (k) => cmd("DEL", k);
export const incr = (k) => cmd("INCR", k);
export const expire = (k, s) => cmd("EXPIRE", k, s);
export const sadd = (k, m) => cmd("SADD", k, m);
export const srem = (k, m) => cmd("SREM", k, m);
export const smembers = (k) => cmd("SMEMBERS", k);

export async function getJSON(k) {
  const v = await get(k);
  if (!v) return null;
  try { return JSON.parse(v); } catch { return null; }
}

export const setJSON = (k, o) => set(k, JSON.stringify(o));

export async function scanKeys(match, limit = 200) {
  const out = [];
  let cursor = "0";
  for (let i = 0; i < 20; i++) {
    const res = await cmd("SCAN", cursor, "MATCH", match, "COUNT", limit);
    if (!res) break;
    cursor = res[0];
    out.push(...(res[1] || []));
    if (cursor === "0") break;
  }
  return out;
}
