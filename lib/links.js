export function baseUrl(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  return `${proto}://${host}`;
}

// ready-to-use URLs. key already andar hai, browser me seedha khulta hai.
export function buildLinks(req, key, { number, count, services } = {}) {
  const base = baseUrl(req);
  const q = new URLSearchParams({ key });
  const num = String(number || "").replace(/\D/g, "");
  if (num) q.set("number", num);
  if (count) q.set("count", String(count));
  if (services) q.set("services", services);

  return {
    url: `${base}/api/v1/bomb?${q.toString()}`,
    endpoint: `${base}/api/v1/bomb?key=${encodeURIComponent(key)}`,
    me: `${base}/api/v1/me?key=${encodeURIComponent(key)}`,
    services: `${base}/api/v1/services`,
  };
}
