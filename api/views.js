const VIEWS_KEY = "retrial:site:views";

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

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    sendJson(res, 405, { error: "method not allowed" });
    return;
  }

  try {
    const redisConfigured = Boolean(getRedisConfig());
    let views;

    if (redisConfigured) {
      views = await redisCommand([req.method === "POST" ? "INCR" : "GET", VIEWS_KEY]);
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
