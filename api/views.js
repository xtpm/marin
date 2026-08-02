const VIEWS_KEY = "retrial:site:views";
const VIEW_SEEN_TTL_SECONDS = 2 * 24 * 60 * 60;
const VIEW_BURST_WINDOW_SECONDS = 60;
const VIEW_BURST_LIMIT = 60;
const { getRequestFingerprint, getWindow, incrementWindowCounter } = require("../lib/abuse-protection");

let localViews = 0;

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function getRedisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    return null;
  }

  return { token, url: url.replace(/\/$/, "") };
}

async function redisCommand(command) {
  const config = getRedisConfig();

  if (!config) {
    return null;
  }

  const response = await fetch(`${config.url}/${command.map(encodeURIComponent).join("/")}`, {
    headers: {
      Authorization: `Bearer ${config.token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Redis command failed: ${response.status}`);
  }

  const data = await response.json();
  return data.result;
}

async function getStoredViews() {
  return Number(await redisCommand(["GET", VIEWS_KEY])) || 0;
}

async function countUniqueView(req) {
  const fingerprint = getRequestFingerprint(req);
  const day = new Date().toISOString().slice(0, 10);
  const firstVisit = await redisCommand([
    "SET",
    `retrial:site:viewed:${day}:${fingerprint}`,
    "1",
    "NX",
    "EX",
    String(VIEW_SEEN_TTL_SECONDS),
  ]);

  if (firstVisit !== "OK") {
    return getStoredViews();
  }

  const { bucket } = getWindow(VIEW_BURST_WINDOW_SECONDS);
  const burstCount = await incrementWindowCounter(
    redisCommand,
    `retrial:rate-limit:views:${bucket}`,
    VIEW_BURST_WINDOW_SECONDS,
  );

  if (burstCount > VIEW_BURST_LIMIT) {
    if (burstCount === VIEW_BURST_LIMIT + 1) {
      console.warn("[views] global view burst limit reached");
    }

    return getStoredViews();
  }

  return Number(await redisCommand(["INCR", VIEWS_KEY])) || 0;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    sendJson(res, 405, { error: "method not allowed" });
    return;
  }

  try {
    const redisConfigured = Boolean(getRedisConfig());
    let views;

    if (redisConfigured) {
      views = req.method === "POST" ? await countUniqueView(req) : await getStoredViews();
    } else {
      if (req.method === "POST") {
        localViews += 1;
      }
      views = localViews;
    }

    sendJson(res, 200, { views: Number(views) || 0 });
  } catch {
    sendJson(res, 500, { error: "view count unavailable" });
  }
};
