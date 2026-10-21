import http from 'node:http';

const STATUS = { not_found: 404, invalid: 400, quota: 429, parse: 502, unavailable: 503 };

function readBody(req) {
  return new Promise((ok, ko) => {
    let s = '';
    req.on('data', c => { s += c; if (s.length > 20000) { ko(new Error('Requête trop grosse')); req.destroy(); } });
    req.on('end', () => { try { ok(JSON.parse(s || '{}')); } catch { ko(new Error('JSON invalide')); } });
  });
}

const send = (res, status, obj) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
};

// Driving adapter: exposes the use case over HTTP and serves the single-page UI.
export function makeHttpServer({ processText, quota, page, trustProxy }) {
  return http.createServer(async (req, res) => {
    // Behind a reverse proxy, TRUST_PROXY=1 makes the quota count real client IPs.
    const ip = (trustProxy && req.headers['x-forwarded-for']?.split(',')[0].trim()) || req.socket.remoteAddress;
    const path = req.url.split('?')[0];

    if (req.method === 'GET' && path === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(page);
    }
    if (req.method === 'GET' && path === '/api/quota') return send(res, 200, quota.status(ip));
    if (req.method !== 'POST' || !path.startsWith('/api/')) return send(res, 404, { detail: 'Introuvable' });

    let body;
    try { body = await readBody(req); } catch (e) { return send(res, 400, { detail: e.message }); }
    try { return send(res, 200, await processText(path.slice(5), body, ip)); }
    catch (e) { return send(res, STATUS[e.code] || 500, { detail: STATUS[e.code] ? e.message : 'Erreur interne' }); }
  });
}
