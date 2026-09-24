const crypto = require("node:crypto");

const COOKIE_NAME = "retrial_private";
const SESSION_SECONDS = 24 * 60 * 60;

function getConfig() {
  const question = String(
    process.env.PRIVATE_TAB_QUESTION || "if you're my spade. what am i to you?",
  ).trim();
  const answer = String(process.env.PRIVATE_TAB_ANSWER || "").trim();
  const secret = process.env.PRIVATE_TAB_SESSION_SECRET || answer;
  return question && answer && secret ? { question, answer, secret } : null;
}

function hash(value) {
  return crypto.createHash("sha256").update(String(value)).digest();
}

function safeEqual(left, right) {
  return crypto.timingSafeEqual(hash(left), hash(right));
}

function normalizeAnswer(value) {
  return String(value).normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

function signSession(expires, secret) {
  return crypto.createHmac("sha256", secret).update(String(expires)).digest("base64url");
}

function createSession(secret) {
  const expires = Date.now() + SESSION_SECONDS * 1000;
  return `${expires}.${signSession(expires, secret)}`;
}

function parseCookies(req) {
  return String(req.headers.cookie || "")
    .split(";")
    .map((part) => part.trim().split("="))
    .reduce((cookies, [key, ...value]) => {
      if (key) {
        const encodedValue = value.join("=");
        try {
          cookies[key] = decodeURIComponent(encodedValue);
        } catch {
          cookies[key] = "";
        }
      }
      return cookies;
    }, {});
}

function hasValidSession(req, secret) {
  const token = parseCookies(req)[COOKIE_NAME] || "";
  const separator = token.indexOf(".");
  if (separator < 1) return false;

  const expires = Number(token.slice(0, separator));
  const signature = token.slice(separator + 1);
  if (!Number.isFinite(expires) || expires <= Date.now()) return false;

  return safeEqual(signature, signSession(expires, secret));
}

function getCookie(req, token, maxAge) {
  const forwardedProtocol = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const secure = forwardedProtocol === "https" || Boolean(process.env.VERCEL);
  return [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${maxAge}`,
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

module.exports = {
  SESSION_SECONDS,
  createSession,
  getConfig,
  getCookie,
  hasValidSession,
  normalizeAnswer,
  safeEqual,
};
