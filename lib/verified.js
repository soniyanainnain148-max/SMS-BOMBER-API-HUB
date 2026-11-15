// health se confirm hui services — sirf yahi default chalti hain
export const VERIFIED = new Set([
  "unacademy-applink",
  "snapdeal-m",
  "getinstacash",
  "redbus-m",
  "swiggy",
  "vedantu",
  "urbanclap",
  "ajio-signup",
  "dominos",
  "oyo",
]);

export const isVerified = (name) => VERIFIED.has(name);
