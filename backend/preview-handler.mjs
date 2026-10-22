import {
  matchesPreviewPassword,
  PRIVATE_HEADERS,
} from '../server/preview-access.mjs';

// The public entry point receives no application or editorial payload before verification.
export function createPreviewOpener({
  readPassword,
  readDocument,
  now = Date.now,
}) {
  const attempts = new Map();
  const reply = (statusCode, data) => ({
    statusCode,
    headers: {
      ...PRIVATE_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(data),
  });
  return async (body, ip = 'unknown') => {
    const prior = attempts.get(ip);
    if (prior && prior.until > now() && prior.failures >= 5) {
      return {
        ...reply(429, {
          error: 'Aguarde 15 minutos antes de tentar novamente.',
        }),
        headers: {
          ...PRIVATE_HEADERS,
          'Content-Type': 'application/json',
          'Retry-After': '900',
        },
      };
    }
    let password;
    try {
      password = await readPassword();
    } catch {
      return reply(503, {
        error: 'Acesso restrito. A senha de revisão ainda não foi configurada.',
      });
    }
    if (typeof password !== 'string' || password.length < 20) {
      return reply(503, {
        error: 'A senha de revisão precisa ter pelo menos 20 caracteres.',
      });
    }
    const supplied =
      body && typeof body === 'object' && !Array.isArray(body)
        ? body.password
        : null;
    if (!matchesPreviewPassword(supplied, password)) {
      if (attempts.size >= 1000) attempts.delete(attempts.keys().next().value);
      attempts.set(ip, {
        failures: prior && prior.until > now() ? prior.failures + 1 : 1,
        until: prior && prior.until > now() ? prior.until : now() + 900000,
      });
      return reply(401, { error: 'Senha incorreta ou acesso não autorizado.' });
    }
    attempts.delete(ip);
    // No shared cache of an authorized response and no token or password in URLs.
    return reply(200, {
      html: await readDocument(),
      expiresAt: now() + 30 * 60 * 1000,
    });
  };
}
