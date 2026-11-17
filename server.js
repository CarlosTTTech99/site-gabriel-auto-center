// Servidor estático sem dependências para o site da Gabriel Auto Center.
// Uso: node site/server.js  (porta padrão 4321, ou PORT=8080)
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT) || 4321;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.mp4': 'video/mp4',
  '.ico': 'image/x-icon'
};
const TEXT = new Set(['.html', '.css', '.js', '.json', '.txt', '.xml', '.svg']);
const LONG_CACHE = new Set(['.webp', '.jpg', '.png', '.mp4', '.ico']);

const SECURITY = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "img-src 'self' data:",
    "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
    "font-src https://fonts.gstatic.com",
    "script-src 'self' 'unsafe-inline'",
    "frame-src https://www.google.com https://maps.google.com",
    "connect-src 'self'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
};

function send(res, status, headers, body) {
  res.writeHead(status, Object.assign({}, SECURITY, headers));
  res.end(body);
}

http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, { Allow: 'GET, HEAD' }, 'Method Not Allowed');
  }
  let urlPath;
  try { urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
  catch { return send(res, 400, {}, 'Bad Request'); }
  if (urlPath.endsWith('/')) urlPath += 'index.html';

  const file = path.normalize(path.join(ROOT, urlPath));
  if (!file.startsWith(ROOT + path.sep)) return send(res, 403, {}, 'Forbidden');

  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Página não encontrada');
    const ext = path.extname(file).toLowerCase();
    const etag = `W/"${st.size.toString(16)}-${st.mtimeMs.toString(16)}"`;
    const headers = {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Cache-Control': LONG_CACHE.has(ext) ? 'public, max-age=2592000' : 'no-cache',
      ETag: etag,
      Vary: 'Accept-Encoding'
    };
    if (req.headers['if-none-match'] === etag) return send(res, 304, headers);

    // Range para vídeo (Safari exige)
    const range = req.headers.range;
    if (range && ext === '.mp4') {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      const start = m && m[1] ? Number(m[1]) : 0;
      const end = m && m[2] ? Math.min(Number(m[2]), st.size - 1) : st.size - 1;
      if (start > end) return send(res, 416, { 'Content-Range': `bytes */${st.size}` });
      res.writeHead(206, Object.assign({}, SECURITY, headers, {
        'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${st.size}`, 'Content-Length': end - start + 1
      }));
      return req.method === 'HEAD' ? res.end() : fs.createReadStream(file, { start, end }).pipe(res);
    }

    const ae = req.headers['accept-encoding'] || '';
    let stream = fs.createReadStream(file);
    if (TEXT.has(ext) && /\bbr\b/.test(ae)) { headers['Content-Encoding'] = 'br'; stream = stream.pipe(zlib.createBrotliCompress()); }
    else if (TEXT.has(ext) && /\bgzip\b/.test(ae)) { headers['Content-Encoding'] = 'gzip'; stream = stream.pipe(zlib.createGzip()); }
    else headers['Content-Length'] = st.size;

    res.writeHead(200, Object.assign({}, SECURITY, headers));
    if (req.method === 'HEAD') return res.end();
    stream.pipe(res);
  });
}).listen(PORT, () => console.log(`Gabriel Auto Center em http://localhost:${PORT}`));
