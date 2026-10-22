import { createHash, timingSafeEqual } from 'node:crypto';

export const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  Pragma: 'no-cache',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Referrer-Policy': 'no-referrer',
};

export function matchesPreviewPassword(actual, expected) {
  if (typeof expected !== 'string' || expected.length < 20) return false;
  if (typeof actual !== 'string' || actual.length > 1024) return false;
  const digest = (value) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(actual), digest(expected));
}

export function createPreviewGuard({ password, enabled, now = Date.now }) {
  const failures = new Map();
  return (req, res) => {
    if (!enabled) return true;
    for (const [key, value] of Object.entries(PRIVATE_HEADERS))
      res.setHeader(key, value);
    if (!password || password.length < 20) {
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Prévia restrita. Aguarde a configuração segura de acesso.');
      return false;
    }
    const ip = req.socket.remoteAddress || 'unknown';
    const entry = failures.get(ip);
    if (entry && entry.until > now() && entry.count >= 5) {
      res.writeHead(429, {
        'Retry-After': '900',
        'Content-Type': 'text/plain; charset=utf-8',
      });
      res.end('Aguarde antes de tentar novamente.');
      return false;
    }
    let supplied = '';
    if (/^Basic [A-Za-z0-9+/=]+$/.test(req.headers.authorization || '')) {
      const decoded = Buffer.from(
        req.headers.authorization.slice(6),
        'base64',
      ).toString('utf8');
      const separator = decoded.indexOf(':');
      if (separator >= 0 && decoded.slice(0, separator) === 'revisao')
        supplied = decoded.slice(separator + 1);
    }
    if (!matchesPreviewPassword(supplied, password)) {
      if (supplied) {
        if (failures.size >= 1000)
          failures.delete(failures.keys().next().value);
        failures.set(ip, {
          count: entry && entry.until > now() ? entry.count + 1 : 1,
          until: entry && entry.until > now() ? entry.until : now() + 900000,
        });
      }
      res.writeHead(401, {
        'WWW-Authenticate':
          'Basic realm="Patri Realty - revisao", charset="UTF-8"',
        'Content-Type': 'text/plain; charset=utf-8',
      });
      res.end('Acesso restrito à revisão da Patri Realty.');
      return false;
    }
    failures.delete(ip);
    return true;
  };
}
