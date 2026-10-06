// Kleiner Testserver für den eigenen PC.
// Aufruf: node serve.mjs  ->  danach http://localhost:4195 
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ORDNER = path.dirname(fileURLToPath(import.meta.url));
const TYPEN = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.json': 'application/json',
};

http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel.endsWith('/')) rel += 'index.html';
  const datei = path.join(ORDNER, path.normalize(rel).replace(/^([\/])+/, ''));
  if (!datei.startsWith(ORDNER)) { res.writeHead(403).end('verboten'); return; }
  fs.readFile(datei, (err, daten) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('nicht gefunden'); return; }
    res.writeHead(200, { 'content-type': TYPEN[path.extname(datei)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(daten);
  });
}).listen(4195, () => console.log('läuft auf http://localhost:4195'));
