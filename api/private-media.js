const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { getConfig, hasValidSession } = require("../lib/private-session");

const assets = {
  "first-interaction": {
    file: "first-interaction.enc",
    contentType: "image/png",
  },
  "first-tease": {
    file: "first-tease.enc",
    contentType: "image/png",
  },
  "one-call": {
    file: "one-call.enc",
    contentType: "image/png",
  },
  "ez-bio-invite": {
    file: "ez-bio-invite.enc",
    contentType: "image/png",
  },
  "being-silly": {
    file: "being-silly.enc",
    contentType: "image/png",
  },
  probo: {
    file: "probo.enc",
    contentType: "image/png",
  },
  "first-flirting": {
    file: "first-flirting.enc",
    contentType: "image/png",
  },
  "exchanged-numbers": {
    file: "exchanged-numbers.enc",
    contentType: "image/png",
  },
  "first-missed-you": {
    file: "first-missed-you.enc",
    contentType: "image/png",
  },
  "first-pictures": {
    file: "first-pictures.enc",
    contentType: "image/png",
  },
  "first-sleep-call": {
    file: "first-sleep-call.enc",
    contentType: "image/png",
  },
  "constant-messages": {
    file: "constant-messages.enc",
    contentType: "image/png",
  },
  "miss-us": {
    file: "miss-us.enc",
    contentType: "image/png",
  },
  "first-i-love-you": {
    file: "first-i-love-you.enc",
    contentType: "image/png",
  },
  "official-01": {
    file: "official-01.enc",
    contentType: "image/png",
  },
  "official-02": {
    file: "official-02.enc",
    contentType: "image/png",
  },
  "so-happy": {
    file: "so-happy.enc",
    contentType: "image/png",
  },
  "family-visit": {
    file: "family-visit.enc",
    contentType: "image/png",
  },
  "cringy-people": {
    file: "cringy-people.enc",
    contentType: "image/png",
  },
  "first-iphone": {
    file: "first-iphone.enc",
    contentType: "image/png",
  },
  "so-cute-01": {
    file: "so-cute-01.enc",
    contentType: "image/png",
  },
  "so-cute-02": {
    file: "so-cute-02.enc",
    contentType: "image/png",
  },
  "cherry-oem": {
    file: "cherry-oem.enc",
    contentType: "image/png",
  },
  "phone-nap": {
    file: "phone-nap.enc",
    contentType: "image/png",
  },
  "cringy-again-01": {
    file: "cringy-again-01.enc",
    contentType: "image/png",
  },
  "cringy-again-02": {
    file: "cringy-again-02.enc",
    contentType: "image/png",
  },
  "matching-ez-bios": {
    file: "matching-ez-bios.enc",
    contentType: "image/png",
  },
  "yeah-bro": {
    file: "yeah-bro.enc",
    contentType: "image/png",
  },
  "card-info": {
    file: "card-info.enc",
    contentType: "image/png",
  },
  "garlic-onion-pasta": {
    file: "garlic-onion-pasta.enc",
    contentType: "image/png",
  },
  "cute-about-me": {
    file: "cute-about-me.enc",
    contentType: "image/png",
  },
  "random-clip": {
    file: "random-clip.enc",
    contentType: "video/mp4",
  },
  "miss-you-so-much": {
    file: "miss-you-so-much.enc",
    contentType: "image/png",
  },
};

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function getAssetName(req) {
  if (req.query?.asset) return String(req.query.asset);
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  return url.searchParams.get("asset") || "";
}

function decryptAsset(fileName) {
  const key = Buffer.from(process.env.PRIVATE_MEDIA_KEY || "", "base64");
  if (key.length !== 32) throw new Error("invalid media key");

  const filePath = path.join(process.cwd(), "private-content", fileName);
  const payload = fs.readFileSync(filePath);
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "method not allowed" });
    return;
  }

  const config = getConfig();
  if (!config || !hasValidSession(req, config.secret)) {
    sendJson(res, 401, { error: "private access required" });
    return;
  }

  const asset = assets[getAssetName(req)];
  if (!asset) {
    sendJson(res, 404, { error: "media not found" });
    return;
  }

  try {
    const body = decryptAsset(asset.file);
    res.statusCode = 200;
    res.setHeader("Content-Type", asset.contentType);
    res.setHeader("Content-Length", body.length);
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.end(body);
  } catch {
    sendJson(res, 503, { error: "private media is unavailable" });
  }
};
