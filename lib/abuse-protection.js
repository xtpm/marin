const { createHash } = require("node:crypto");

function getHeader(req, name) {
  const value = req.headers?.[name];
  return Array.isArray(value) ? value[0] : String(value || "");
}

function getRequestFingerprint(req) {
  const forwarded = getHeader(req, "x-forwarded-for").split(",")[0].trim();
  const address = forwarded || getHeader(req, "x-real-ip").trim() || req.socket?.remoteAddress || "unknown";
  const salt = process.env.RATE_LIMIT_SALT || process.env.GUESTBOOK_LOVE_TOKEN || "retrial-public-api";

  return createHash("sha256").update(`${salt}:${address}`).digest("hex").slice(0, 32);
}

function getWindow(windowSeconds) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(nowSeconds / windowSeconds);
  const retryAfter = Math.max(1, windowSeconds - (nowSeconds % windowSeconds));

  return { bucket, retryAfter };
}

async function incrementWindowCounter(redisCommand, key, windowSeconds) {
  const count = Number(await redisCommand(["INCR", key])) || 0;

  if (count === 1) {
    await redisCommand(["EXPIRE", key, String(windowSeconds)]);
  }

  return count;
}

async function checkRequestLimit({
  redisCommand,
  prefix,
  fingerprint,
  perClientLimit,
  globalLimit,
  windowSeconds,
}) {
  const { bucket, retryAfter } = getWindow(windowSeconds);
  const clientCount = await incrementWindowCounter(
    redisCommand,
    `${prefix}:${bucket}:client:${fingerprint}`,
    windowSeconds,
  );

  if (clientCount > perClientLimit) {
    return { allowed: false, reason: "client", count: clientCount, retryAfter };
  }

  const globalCount = await incrementWindowCounter(redisCommand, `${prefix}:${bucket}:global`, windowSeconds);

  return {
    allowed: globalCount <= globalLimit,
    reason: globalCount > globalLimit ? "global" : "",
    count: globalCount,
    retryAfter,
  };
}

module.exports = {
  checkRequestLimit,
  getRequestFingerprint,
  getWindow,
  incrementWindowCounter,
};
