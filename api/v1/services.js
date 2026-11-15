import { SERVICES } from "../../lib/services.js";
import { disabledSet } from "../../lib/engine.js";
import { isVerified } from "../../lib/verified.js";

export default async function handler(req, res) {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("content-type", "application/json; charset=utf-8");
  const disabled = await disabledSet();
  const known = new Set(SERVICES.map((s) => s.name));
  const dead = [...disabled].filter((n) => known.has(n));
  const verified = SERVICES.filter((s) => isVerified(s.name));

  res.end(JSON.stringify({
    total: SERVICES.length,
    live: SERVICES.length - dead.length,
    verified: verified.length,
    verifiedLive: verified.filter((s) => !disabled.has(s.name)).length,
    disabled: dead,
    services: SERVICES.map((s) => ({
      name: s.name,
      live: !disabled.has(s.name),
      verified: isVerified(s.name),
    })),
  }));
}
