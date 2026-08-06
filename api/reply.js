const PUBLIC_KEY = "retrial:guestbook:public";
const MAX_COMMENTS_PER_MESSAGE = 24;

function sendHtml(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'",
  );
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>guestbook replies / retrial</title><style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100vh;padding:32px;background:#15221c;color:#f4f7f2;font:14px/1.5 ui-monospace,monospace}main{width:min(720px,100%);margin:auto;border-top:1px solid #8be5b8}header{padding:28px 0;border-bottom:1px solid #3b5045}h1{margin:0;font-size:clamp(30px,7vw,64px);line-height:.9}h1 span,a{color:#8be5b8}p{max-width:62ch}.entry{padding:22px 0;border-bottom:1px solid #3b5045}.entry small{display:block;margin-bottom:8px;color:#8be5b8;text-transform:uppercase}.entry strong{font-size:20px}.entry p{margin:8px 0 0}.actions{display:flex;gap:16px;margin-top:14px;font-size:11px;text-transform:uppercase}form{display:grid;gap:14px;padding:24px 0}textarea{width:100%;min-height:130px;padding:14px;border:1px solid #77877c;background:#07120c;color:#f4f7f2;font:inherit;resize:vertical}button{width:max-content;padding:11px 16px;border:1px solid #8be5b8;background:#8be5b8;color:#07120c;font:inherit;text-transform:uppercase;cursor:pointer}.reply{margin-top:14px;padding:14px;border-left:2px solid #52c58e;background:#07120c}.reply div{display:flex;justify-content:space-between;gap:16px;color:#bcc8bf;font-size:11px}.reply p{margin:7px 0 0}.muted{color:#77877c}</style></head><body><main>${body}</main></body></html>`);
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return entities[character];
  });
}

function cleanText(value, maxLength) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function getReplyToken() {
  return process.env.GUESTBOOK_REPLY_TOKEN || process.env.GUESTBOOK_DELETE_TOKEN || process.env.GUESTBOOK_LOVE_TOKEN;
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
    headers: { Authorization: `Bearer ${config.token}` },
  });

  if (!response.ok) {
    throw new Error(`Redis command failed: ${response.status}`);
  }

  return (await response.json()).result;
}

async function getPublicEntries() {
  const raw = await redisCommand(["GET", PUBLIC_KEY]);

  if (!raw) {
    return [];
  }

  const entries = JSON.parse(raw);
  return Array.isArray(entries) ? entries : [];
}

async function savePublicEntries(entries) {
  await redisCommand(["SET", PUBLIC_KEY, JSON.stringify(entries)]);
}

async function readForm(req) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;

    if (size > 5000) {
      throw new Error("request too large");
    }

    chunks.push(chunk);
  }

  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}

function getReplyLink(entry, token) {
  const params = new URLSearchParams({ id: entry.id, token });
  return `/api/reply?${params.toString()}`;
}

function renderReply(entry, token) {
  const comments = Array.isArray(entry.comments) ? entry.comments : [];
  const deleteToken = process.env.GUESTBOOK_DELETE_TOKEN || process.env.GUESTBOOK_LOVE_TOKEN;
  const replies = comments
    .map((comment) => {
      let removeLink = "";

      if (deleteToken) {
        const params = new URLSearchParams({ id: entry.id, comment: comment.id, token: deleteToken });
        removeLink = `<a href="/api/delete?${params.toString()}">delete</a>`;
      }

      return `<div class="reply"><div><strong>retrial</strong><span>${escapeHtml(
        new Date(comment.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" }),
      )} ${removeLink}</span></div><p>${escapeHtml(comment.message)}</p></div>`;
    })
    .join("");
  const dashboardParams = new URLSearchParams({ token });

  return `<header><p><a href="/api/reply?${dashboardParams.toString()}">all messages</a></p><h1>reply to <span>${escapeHtml(
    entry.name || "anonymous",
  )}</span></h1></header><section class="entry"><small>guestbook message</small><strong>${escapeHtml(
    entry.name || "anonymous",
  )}</strong><p>${escapeHtml(entry.message)}</p>${replies}</section><form method="post" action="/api/reply"><input type="hidden" name="token" value="${escapeHtml(
    token,
  )}"><input type="hidden" name="id" value="${escapeHtml(
    entry.id,
  )}"><label for="reply">your reply</label><textarea id="reply" name="message" maxlength="180" required autofocus></textarea><button type="submit">publish reply</button></form>`;
}

function renderDashboard(entries, token) {
  const items = entries
    .map((entry) => {
      const count = Array.isArray(entry.comments) ? entry.comments.length : 0;
      return `<article class="entry"><small>${escapeHtml(entry.name || "anonymous")} / ${String(count).padStart(
        2,
        "0",
      )} replies</small><strong>${escapeHtml(entry.message)}</strong><div class="actions"><a href="${escapeHtml(
        getReplyLink(entry, token),
      )}">write reply</a></div></article>`;
    })
    .join("");

  return `<header><h1>owner <span>replies</span></h1><p class="muted">Private guestbook controls.</p></header>${
    items || '<p class="entry muted">No public messages yet.</p>'
  }`;
}

module.exports = async function handler(req, res) {
  try {
    const expectedToken = getReplyToken();

    if (!expectedToken) {
      sendHtml(res, 503, "<header><h1>replies unavailable</h1></header>");
      return;
    }

    if (req.method === "GET") {
      const requestUrl = new URL(req.url || "/", `https://${req.headers.host || "retrial.cc"}`);
      const token = requestUrl.searchParams.get("token") || "";
      const id = requestUrl.searchParams.get("id") || "";

      if (token !== expectedToken) {
        sendHtml(res, 401, "<header><h1>private <span>page</span></h1><p>This link is only for retrial.</p></header>");
        return;
      }

      if (!getRedisConfig()) {
        sendHtml(res, 503, "<header><h1>storage unavailable</h1></header>");
        return;
      }

      const entries = await getPublicEntries();

      if (!id) {
        sendHtml(res, 200, renderDashboard(entries, token));
        return;
      }

      const entry = entries.find((item) => item.id === id);

      if (!entry) {
        sendHtml(res, 404, "<header><h1>message not found</h1></header>");
        return;
      }

      sendHtml(res, 200, renderReply(entry, token));
      return;
    }

    if (req.method !== "POST") {
      sendHtml(res, 405, "<header><h1>method not allowed</h1></header>");
      return;
    }

    const form = await readForm(req);
    const token = form.get("token") || "";
    const id = cleanText(form.get("id"), 80);
    const message = cleanText(form.get("message"), 180);

    if (token !== expectedToken) {
      sendHtml(res, 401, "<header><h1>private <span>page</span></h1></header>");
      return;
    }

    if (!getRedisConfig()) {
      sendHtml(res, 503, "<header><h1>storage unavailable</h1></header>");
      return;
    }

    if (message.length < 2) {
      sendHtml(res, 400, "<header><h1>reply too short</h1></header>");
      return;
    }

    const entries = await getPublicEntries();
    const entry = entries.find((item) => item.id === id);

    if (!entry) {
      sendHtml(res, 404, "<header><h1>message not found</h1></header>");
      return;
    }

    const comments = Array.isArray(entry.comments) ? entry.comments : [];

    if (comments.length >= MAX_COMMENTS_PER_MESSAGE) {
      sendHtml(res, 409, "<header><h1>thread full</h1></header>");
      return;
    }

    entry.comments = [
      ...comments,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: "retrial",
        message,
        createdAt: new Date().toISOString(),
      },
    ];
    await savePublicEntries(entries);
    sendHtml(res, 200, `${renderReply(entry, token)}<p><strong>reply published.</strong></p>`);
  } catch {
    sendHtml(res, 500, "<header><h1>reply failed</h1><p>Try again in a moment.</p></header>");
  }
};
