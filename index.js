const functions = require("@google-cloud/functions-framework");
const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "public");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function resolvePublicPath(requestPath) {
  const cleanPath = decodeURIComponent(requestPath.split("?")[0]).replace(/^\/+/, "");
  const relativePath = cleanPath || "index.html";
  const filePath = path.normalize(path.join(publicDir, relativePath));

  if (!filePath.startsWith(publicDir)) {
    return null;
  }

  return fs.existsSync(filePath) && fs.statSync(filePath).isFile()
    ? filePath
    : path.join(publicDir, "index.html");
}

functions.http("helloHttp", (req, res) => {
  const filePath = resolvePublicPath(req.url || "/");

  if (!filePath) {
    res.status(403).send("Forbidden");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.setHeader("Content-Type", mimeTypes[ext] || "application/octet-stream");
  fs.createReadStream(filePath).pipe(res);
});
