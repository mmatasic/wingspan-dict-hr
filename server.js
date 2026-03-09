import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

const publicDir = path.resolve("public");
const port = process.env.PORT || 4173;

const mimeTypes = {
  html: "text/html; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  json: "application/json; charset=utf-8",
  csv: "text/csv; charset=utf-8"
};

const server = http.createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, `http://${req.headers.host}`);
    const safePath = pathname === "/" ? "/index.html" : pathname;
    const fullPath = path.join(publicDir, path.normalize(safePath).replace(/^\.\//, ""));
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      res.writeHead(301, { Location: "/" });
      res.end();
      return;
    }

    const ext = path.extname(fullPath).slice(1).toLowerCase();
    const headers = {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": "no-cache"
    };

    const data = await fs.readFile(fullPath);
    res.writeHead(200, headers);
    res.end(data);
  } catch (error) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
});

server.listen(port, () => {
  console.log(`Serving static files at http://localhost:${port}`);
});
