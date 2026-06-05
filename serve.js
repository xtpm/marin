const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const port = Number(process.env.PORT || 5173);
const liveReloadClients = new Set();

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const liveReloadScript = `
<script>
(() => {
  const events = new EventSource("/__live-reload");
  events.addEventListener("reload", () => window.location.reload());
})();
</script>`;

function sendLiveReload() {
  for (const res of liveReloadClients) {
    res.write("event: reload\\ndata: now\\n\\n");
  }
}

function watchForChanges() {
  const watched = ["index.html", "cd.html", "styles.css", "script.js", "cd.js", "data", "api"];
  let timer;

  watched.forEach((item) => {
    const target = path.join(root, item);
    if (!fs.existsSync(target)) {
      return;
    }

    fs.watch(target, { recursive: fs.statSync(target).isDirectory() }, () => {
      clearTimeout(timer);
      timer = setTimeout(sendLiveReload, 80);
    });
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  if (url.pathname === "/__live-reload") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    });
    res.write("retry: 1000\n\n");
    liveReloadClients.add(res);
    req.on("close", () => liveReloadClients.delete(res));
    return;
  }

  if (url.pathname === "/api/guestbook") {
    require("./api/guestbook")(req, res);
    return;
  }

  if (url.pathname === "/api/love") {
    require("./api/love")(req, res);
    return;
  }

  if (url.pathname === "/api/delete") {
    require("./api/delete")(req, res);
    return;
  }

  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.resolve(root, `.${requested}`);

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const extension = path.extname(filePath);
    const contentType = types[extension] || "application/octet-stream";
    let body = data;

    if (extension === ".html") {
      body = Buffer.from(data.toString("utf8").replace("</body>", `${liveReloadScript}\n</body>`));
    }

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    });
    res.end(body);
  });
});

server.listen(port, "127.0.0.1", () => {
  watchForChanges();
  console.log(`retrial site running at http://127.0.0.1:${port}/`);
});
