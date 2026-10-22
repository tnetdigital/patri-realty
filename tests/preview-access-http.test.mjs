import test from 'node:test';
import assert from 'node:assert/strict';
import { createPreviewOpener } from '../backend/preview-handler.mjs';
import { createPreviewGuard } from '../server/preview-access.mjs';

const testPassword = 'Only-a-synthetic-test-password-2026';
const confidential = '<h1>Private editorial canary</h1>';

test('prévia: dados são lidos somente após senha validada no servidor', async () => {
  let reads = 0;
  const open = createPreviewOpener({
    readPassword: async () => testPassword,
    readDocument: async () => {
      reads++;
      return confidential;
    },
  });
  for (const value of [
    null,
    {},
    { password: '' },
    { password: 'incorrect' },
    { password: 5 },
  ]) {
    const response = await open(value, String(value));
    assert.equal(response.statusCode, 401);
    assert.ok(!response.body.includes(confidential));
    assert.equal(
      response.headers['Cache-Control'],
      'private, no-store, max-age=0',
    );
  }
  assert.equal(reads, 0);
  const valid = await open({ password: testPassword }, 'authorized');
  assert.equal(valid.statusCode, 200);
  assert.equal(JSON.parse(valid.body).html, confidential);
  assert.equal(reads, 1);
  assert.ok(!valid.body.includes(testPassword));
  assert.ok(valid.headers['X-Robots-Tag'].includes('noindex'));
});

test('prévia: falta de segredo e senha fraca bloqueiam sem expor documento', async () => {
  for (const readPassword of [
    async () => {
      throw Error('missing');
    },
    async () => 'short',
  ]) {
    const open = createPreviewOpener({
      readPassword,
      readDocument: async () => {
        throw Error('must not read');
      },
    });
    assert.equal((await open({ password: testPassword })).statusCode, 503);
  }
});

test('prévia: tentativas são limitadas por origem e a janela expira', async () => {
  let clock = 1000000;
  const open = createPreviewOpener({
    readPassword: async () => testPassword,
    readDocument: async () => confidential,
    now: () => clock,
  });
  for (let i = 0; i < 5; i++)
    assert.equal(
      (await open({ password: 'incorrect' }, 'one')).statusCode,
      401,
    );
  assert.equal((await open({ password: testPassword }, 'one')).statusCode, 429);
  assert.equal(
    (await open({ password: testPassword }, 'other')).statusCode,
    200,
  );
  clock += 900001;
  const valid = await open({ password: testPassword }, 'one');
  assert.equal(valid.statusCode, 200);
  assert.equal(JSON.parse(valid.body).expiresAt, clock + 1800000);
});

function request(auth) {
  const result = { headers: {}, status: 200, body: '' };
  const res = {
    setHeader: (k, v) => {
      result.headers[k] = v;
    },
    writeHead: (s, h = {}) => {
      result.status = s;
      Object.assign(result.headers, h);
      return res;
    },
    end: (body = '') => {
      result.body = body;
    },
  };
  return {
    req: {
      socket: { remoteAddress: '127.0.0.1' },
      headers: { authorization: auth },
    },
    res,
    result,
  };
}

test('SSR: senha ausente falha fechada e acesso anônimo recebe desafio real', () => {
  const absent = request();
  assert.equal(
    createPreviewGuard({ enabled: true })(absent.req, absent.res),
    false,
  );
  assert.equal(absent.result.status, 503);
  const anon = request();
  assert.equal(
    createPreviewGuard({ enabled: true, password: testPassword })(
      anon.req,
      anon.res,
    ),
    false,
  );
  assert.equal(anon.result.status, 401);
  assert.match(anon.result.headers['WWW-Authenticate'], /^Basic/);
});

test('SSR: credenciais inválidas e usuário diferente são negados; revisão recebe no-store', () => {
  const guard = createPreviewGuard({ enabled: true, password: testPassword });
  for (const auth of [
    'Bearer fake',
    'Basic invalid',
    'Basic ' + Buffer.from('other:' + testPassword).toString('base64'),
  ]) {
    const x = request(auth);
    assert.equal(guard(x.req, x.res), false);
    assert.equal(x.result.status, 401);
  }
  const valid = request(
    'Basic ' + Buffer.from('revisao:' + testPassword).toString('base64'),
  );
  assert.equal(guard(valid.req, valid.res), true);
  assert.match(valid.result.headers['Cache-Control'], /private, no-store/);
});
