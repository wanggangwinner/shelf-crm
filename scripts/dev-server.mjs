import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(rootDir, 'public');
const port = Number(process.env.PORT ?? 5173);

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
]);

function safePublicPath(requestUrl) {
  const url = new URL(requestUrl ?? '/', `http://localhost:${port}`);
  const requestedPath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const resolvedPath = path.resolve(publicDir, `.${requestedPath}`);

  if (!resolvedPath.startsWith(publicDir)) {
    return path.join(publicDir, 'index.html');
  }

  return resolvedPath;
}

const server = http.createServer(async (request, response) => {
  let filePath = safePublicPath(request.url);

  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  } catch {
    filePath = path.join(publicDir, 'index.html');
  }

  response.setHeader('Content-Type', contentTypes.get(path.extname(filePath)) ?? 'application/octet-stream');
  createReadStream(filePath)
    .on('error', () => {
      response.statusCode = 404;
      response.end('Not found');
    })
    .pipe(response);
});

server.listen(port, () => {
  console.log(`货架客户 CRM dev server running at http://localhost:${port}`);
});
