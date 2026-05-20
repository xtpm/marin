const PUBLIC_KEY = "retrial:guestbook:public";
const MAX_PUBLIC_MESSAGES = 60;

const seedEntries = [
  {
    id: "seed-mke",
    name: "mke",
    discord: "",
    message: "site feels clean. retrial era looking real.",
    createdAt: "2026-05-17T12:00:00.000Z",
    visibility: "public",
  },
  {
    id: "seed-anonymous",
    name: "anonymous",
    discord: "",
    message: "leaving this here before the wall fills up.",
    createdAt: "2026-05-17T12:05:00.000Z",
    visibility: "public",
  },
];

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function cleanText(value, fallback, maxLength) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

  return text || fallback;
}

function getSiteUrl() {
  const url = process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;

  if (!url) {
    return "";
  }

  return url.startsWith("http") ? url.replace(/\/$/, "") : `https://${url.replace(/\/$/, "")}`;
}

function getLoveUrl(entry) {
  const token = process.env.GUESTBOOK_LOVE_TOKEN;
  const siteUrl = getSiteUrl();

  if (!token || !siteUrl || entry.visibility !== "public") {
    return "";
  }

  const params = new URLSearchParams({
    id: entry.id,
    token,
  });

  return `${siteUrl}/api/love?${params.toString()}`;
}

function getDeleteUrl(entry) {
  const token = process.env.GUESTBOOK_DELETE_TOKEN || process.env.GUESTBOOK_LOVE_TOKEN;
  const siteUrl = getSiteUrl();

  if (!token || !siteUrl || entry.visibility !== "public") {
    return "";
  }

  const params = new URLSearchParams({
    id: entry.id,
    token,
  });

  return `${siteUrl}/api/delete?${params.toString()}`;
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
    return seedEntries;
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : seedEntries;
  } catch {
    return seedEntries;
  }
}

async function savePublicEntries(entries) {
  await redisCommand(["SET", PUBLIC_KEY, JSON.stringify(entries)]);
}

async function sendDiscord(entry) {
  const webhook = process.env.DISCORD_WEBHOOK_URL;

  if (!webhook) {
    return false;
  }

  const visibility = entry.visibility === "private" ? "private note" : "public guestbook";
  const loveUrl = getLoveUrl(entry);
  const deleteUrl = getDeleteUrl(entry);
  const fields = [
    { name: "name", value: entry.name, inline: true },
    { name: "discord", value: entry.discord || "not provided", inline: true },
    { name: "visibility", value: visibility, inline: true },
    { name: "message", value: entry.message },
  ];

  const payload = {
    username: "retrial guestbook",
    embeds: [
      {
        title: visibility,
        color: entry.visibility === "private" ? 0x7fb4ff : 0x3ba55d,
        fields,
        timestamp: entry.createdAt,
      },
    ],
  };

  if (loveUrl || deleteUrl) {
    const components = [];

    if (loveUrl) {
      components.push({
        type: 2,
        style: 5,
        label: "love this",
        url: loveUrl,
      });
    }

    if (deleteUrl) {
      components.push({
        type: 2,
        style: 5,
        label: "delete",
        url: deleteUrl,
      });
    }

    payload.components = [
      {
        type: 1,
        components,
      },
    ];
  }

  const webhookUrl = new URL(webhook);
  webhookUrl.searchParams.set("with_components", "true");

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Discord webhook failed: ${response.status}`);
  }

  return true;
}

async function readBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const entries = await getPublicEntries();
      sendJson(res, 200, { entries });
      return;
    }

    if (req.method !== "POST") {
      sendJson(res, 405, { error: "method not allowed" });
      return;
    }

    const body = await readBody(req);
    const message = cleanText(body.message, "", 240);
    const visibility = body.visibility === "private" ? "private" : "public";

    if (message.length < 2) {
      sendJson(res, 400, { error: "message is too short" });
      return;
    }

    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: cleanText(body.name, "anonymous", 32),
      discord: cleanText(body.discord, "", 32),
      message,
      visibility,
      loved: false,
      createdAt: new Date().toISOString(),
    };

    if (visibility === "private") {
      const discordSent = await sendDiscord(entry);

      if (!discordSent) {
        sendJson(res, 503, { error: "private notes are not configured yet" });
        return;
      }

      sendJson(res, 200, { ok: true, private: true });
      return;
    }

    const entries = [entry, ...(await getPublicEntries()).filter((item) => !String(item.id).startsWith("seed-"))].slice(
      0,
      MAX_PUBLIC_MESSAGES,
    );

    if (getRedisConfig()) {
      await savePublicEntries(entries);
    }

    try {
      await sendDiscord(entry);
    } catch {
      // Public guestbook messages should still save even if Discord delivery is unavailable.
    }

    sendJson(res, 200, { ok: true, entry, entries });
  } catch (error) {
    sendJson(res, 500, { error: "guestbook unavailable" });
  }
};
