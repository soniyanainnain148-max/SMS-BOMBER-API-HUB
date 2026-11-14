import { SERVICES } from "../../lib/services.js";
import { authenticate } from "../../lib/auth.js";
import { fire } from "../../lib/engine.js";
import { set } from "../../lib/redis.js";

export const config = { maxDuration: 30 };

const LOCK_SEC = 45;

// status + body dono. HTML page = koi proof nahi. Negative keyword pehle check.
function bucket(r) {
  const s = r.status;
  const body = String(r.note || "").trim();
  const low = body.toLowerCase();

  if (s === 0) return "down";
  if (s === 401) return "auth";
  if (s === 403 || s === 429) return "blocked";
  if (s === 404 || s === 405 || s === 410) return "gone";
  if (s >= 500) return "down";
  if (s >= 400) return "badreq";

  if (!body) return "unknown";
  if (low.startsWith("<!doctype") || low.startsWith("<html") || low.includes("<script")) return "page";

  if (/"error"\s*:\s*(1|true)|"iserror"\s*:\s*true|"status"\s*:\s*4\d\d|"code"\s*:\s*"0\d"|failed|invalid|captcha|timeout|already|not valid|"exists?"\s*:\s*true/.test(low)) {
    return "failed";
  }
  if (/otp|sent|success|"statuscode"\s*:\s*"1"|generated/.test(low)) return "sent";
  return "unknown";
}

function reply(res, code, payload) {
  res.statusCode = code;
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(payload, null, 2));
}

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);

  const key = url.searchParams.get("key");
  const secret = process.env.ADMIN_SECRET;
  let authed = false;
  if (key) authed = (await authenticate(key)).ok;
  else if (secret && url.searchParams.get("secret") === secret) authed = true;
  if (!authed) {
    return reply(res, 401, {
      ok: false,
      error: "auth chahiye",
      hint: "?key=<api key> ya ?secret=<ADMIN_SECRET>",
    });
  }

  const lock = await set("health:lock", "1", "NX", "EX", LOCK_SEC).catch(() => "1");
  if (lock === null) {
    return reply(res, 429, { ok: false, error: `thodi der ruko — ${LOCK_SEC} second me ek hi run allowed` });
  }

  const digits = (url.searchParams.get("number") || "9876543210").replace(/\D/g, "").slice(-10);
  const test = "+91" + digits;
  const only = (url.searchParams.get("only") || "")
    .split(",").map((x) => x.trim()).filter(Boolean);
  const list = only.length ? SERVICES.filter((s) => only.includes(s.name)) : SERVICES;
  if (!list.length) return reply(res, 400, { ok: false, error: "koi service match nahi hui" });

  const results = [];
  let cursor = 0;
  await Promise.all(
    Array.from({ length: 12 }, async () => {
      while (cursor < list.length) {
        const svc = list[cursor++];
        const r = await fire(svc, test, digits, { track: false });
        results.push({
          service: r.service, status: r.status, ms: r.ms,
          kind: bucket(r), body: r.note.slice(0, 80),
        });
      }
    })
  );

  const count = (k) => results.filter((r) => r.kind === k).length;
  const summary = {
    sent: count("sent"), failed: count("failed"), page: count("page"),
    unknown: count("unknown"), auth: count("auth"), blocked: count("blocked"),
    badreq: count("badreq"), gone: count("gone"), down: count("down"),
  };

  return reply(res, 200, {
    checkedAt: new Date().toISOString(),
    testedWith: test,
    total: results.length,
    summary,
    confirmed: results.filter((r) => r.kind === "sent").map((r) => r.service),
    passRate: Math.round((summary.sent / results.length) * 100) + "%",
    note: `${summary.sent}/${results.length} ne OTP ka proof diya. page = HTML page aaya, proof nahi. auth = token chahiye. blocked = IP block. failed = body me error.`,
    results: results.sort((a, b) => a.service.localeCompare(b.service)),
  });
}
