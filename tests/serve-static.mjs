import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";

const root = resolve(".output/public");
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};
createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://127.0.0.1:5179").pathname;
  const path = resolve(
    root,
    `.${pathname.endsWith("/") ? pathname + "index.html" : pathname}`,
  );
  if (!path.startsWith(`${root}/`)) {
    response.writeHead(403).end();
    return;
  }
  try {
    const content = await readFile(path);
    response
      .writeHead(200, {
        "Content-Type": mime[extname(path)] || "application/octet-stream",
        "Cache-Control": "no-store",
      })
      .end(content);
  } catch {
    response.writeHead(404).end();
  }
}).listen(Number(process.env.PORT || 5179), "127.0.0.1");
