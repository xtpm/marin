const PUBLIC_KEY = "retrial:guestbook:public";

function sendHtml(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>retrial</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#030712;color:#e9edf7;font:16px/1.6 monospace}main{width:min(520px,calc(100% - 40px));border:1px solid #24314f;padding:22px;background:#070e1f}a{color:#7fb4ff}</style></head><body><main>${body}</main></body></html>`);
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return entities[character];
  });
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

async function getPublicEntries() {
  const raw = await redisCommand(["GET", PUBLIC_KEY]);

  if (!raw) {
    return [];
  }

  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

async function savePublicEntries(entries) {
  await redisCommand(["SET", PUBLIC_KEY, JSON.stringify(entries)]);
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      sendHtml(res, 405, "<h1>method not allowed</h1>");
      return;
    }

    const requestUrl = new URL(req.url || "/", `https://${req.headers.host || "retrial.cc"}`);
    const id = requestUrl.searchParams.get("id");
    const commentId = requestUrl.searchParams.get("comment");
    const token = requestUrl.searchParams.get("token");
    const expectedToken = process.env.GUESTBOOK_DELETE_TOKEN || process.env.GUESTBOOK_LOVE_TOKEN;

    if (!expectedToken || token !== expectedToken) {
      sendHtml(res, 401, "<h1>nope</h1><p>this delete link is private.</p>");
      return;
    }

    if (!id || !getRedisConfig()) {
      sendHtml(res, 400, "<h1>could not delete this</h1><p>guestbook storage is not ready.</p>");
      return;
    }

    const entries = await getPublicEntries();
    const entry = entries.find((item) => item.id === id);

    if (!entry) {
      sendHtml(res, 404, "<h1>message not found</h1><p>it may already be gone.</p>");
      return;
    }

    if (commentId) {
      const comments = Array.isArray(entry.comments) ? entry.comments : [];
      const comment = comments.find((item) => item.id === commentId);

      if (!comment) {
        sendHtml(res, 404, "<h1>comment not found</h1><p>it may already be gone.</p>");
        return;
      }

      entry.comments = comments.filter((item) => item.id !== commentId);
      await savePublicEntries(entries);
      sendHtml(
        res,
        200,
        `<h1>deleted</h1><p>removed <strong>${escapeHtml(comment.name || "anonymous")}</strong>'s comment.</p><p><a href="/">back to site</a></p>`,
      );
      return;
    }

    await savePublicEntries(entries.filter((item) => item.id !== id));

    sendHtml(
      res,
      200,
      `<h1>deleted</h1><p>removed <strong>${escapeHtml(entry.name || "anonymous")}</strong>'s message from the guestbook.</p><p><a href="/">back to site</a></p>`,
    );
  } catch {
    sendHtml(res, 500, "<h1>delete failed</h1><p>try again in a second.</p>");
  }
};
