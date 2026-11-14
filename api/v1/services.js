import { SERVICES } from "../../lib/services.js";
import { disabledSet } from "../../lib/engine.js";

export default async function handler(req, res) {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("content-type", "application/json; charset=utf-8");
  const disabled = await disabledSet();
  res.end(JSON.stringify({
    total: SERVICES.length,
    live: SERVICES.length - disabled.size,
    disabled: [...disabled],
    services: SERVICES.map((s) => ({ name: s.name, live: !disabled.has(s.name) })),
  }));
}
