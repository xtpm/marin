const { getRequestFingerprint } = require("../lib/abuse-protection");
const {
  SESSION_SECONDS,
  createSession,
  getConfig,
  getCookie,
  hasValidSession,
  normalizeAnswer,
  safeEqual,
} = require("../lib/private-session");

const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const ATTEMPT_LIMIT = 6;
const MAX_REQUEST_BYTES = 2 * 1024;
const attempts = new Map();

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;

  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (Buffer.byteLength(raw) > MAX_REQUEST_BYTES) throw new Error("request too large");
  }

  return raw ? JSON.parse(raw) : {};
}

function canAttempt(req) {
  const key = getRequestFingerprint(req);
  const now = Date.now();
  const existing = attempts.get(key);

  if (!existing || now - existing.startedAt >= ATTEMPT_WINDOW_MS) {
    attempts.set(key, { count: 1, startedAt: now });
    return true;
  }

  existing.count += 1;
  return existing.count <= ATTEMPT_LIMIT;
}

module.exports = async function handler(req, res) {
  const config = getConfig();
  if (!config) {
    sendJson(res, 503, { error: "private archive is not configured" });
    return;
  }

  if (req.method === "GET") {
    sendJson(res, 200, {
      authenticated: hasValidSession(req, config.secret),
      question: config.question,
    });
    return;
  }

  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", getCookie(req, "", 0));
    sendJson(res, 200, { authenticated: false });
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "method not allowed" });
    return;
  }

  if (!canAttempt(req)) {
    sendJson(res, 429, { error: "too many attempts; try again later" });
    return;
  }

  try {
    const body = await readBody(req);
    const submittedAnswer = normalizeAnswer(body.answer || "");
    if (!safeEqual(submittedAnswer, normalizeAnswer(config.answer))) {
      sendJson(res, 401, { error: "incorrect answer" });
      return;
    }

    const token = createSession(config.secret);
    res.setHeader("Set-Cookie", getCookie(req, token, SESSION_SECONDS));
    sendJson(res, 200, { authenticated: true });
  } catch {
    sendJson(res, 400, { error: "invalid request" });
  }
};
