import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Execute the actual Edge entrypoint with controlled Deno and transport adapters.
function load(name, enabled = true) {
  let handler;
  const calls = [];
  const client = {
    rpc: async (name) => { calls.push(name); return { data: [], error: null }; },
    from: () => ({ select: () => ({ eq: async () => ({ count: 2 }) }) }),
  };
  const env = {
    SUPPLIER_JOBS_SECRET: 'fixture-secret', SUPABASE_URL: 'https://fixture.invalid',
    SUPABASE_SERVICE_ROLE_KEY: 'fixture-key', SITE_URL: 'https://fixture.invalid',
    EMAIL_DELIVERY_ENABLED: enabled ? 'true' : 'false', RESEND_API_KEY: 'fixture', EMAIL_FROM: 'fixture@example.invalid',
  };
  const code = ts.transpileModule(readFileSync(`supabase/functions/${name}/index.ts`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(code, {
    exports: {}, Request, Response, console,
    Deno: { env: { get: (key) => env[key] }, serve: (fn) => { handler = fn; } },
    fetch: async () => { throw Error('External transport prohibited'); },
    require: (path) => {
      if (path.includes('supabase-js')) return { createClient: () => client };
      if (path.includes('email-delivery')) return { deliverEmail: () => { throw Error('Unexpected delivery'); } };
      if (path.includes('job-log')) return { logJobFailure: () => { throw Error('Unexpected job failure'); } };
      if (path.includes('email-templates')) return { renderEmail: () => { throw Error('Unexpected template'); } };
      throw Error('Unexpected import');
    },
  });
  return { handler, calls };
}
const request = (method = 'POST', authorized = true) => new Request('https://fixture.invalid', {
  method, headers: authorized ? { Authorization: 'Bearer fixture-secret' } : {},
});
test('email worker enabled prepares and drains without invoking editorial publication', async () => {
  const h = load('supplier-jobs');
  assert.equal((await h.handler(request())).status, 200);
  assert(h.calls.includes('reservar_emails_fornecedor'));
  assert(h.calls.includes('preparar_alertas_orcamento'));
  assert(!h.calls.includes('publicar_agendadas'));
});
test('email simulation neither reserves nor publishes', async () => {
  const h = load('supplier-jobs', false);
  const r = await h.handler(request());
  assert.equal((await r.json()).simulado, true);
  assert.deepEqual(h.calls, []);
});
test('worker rejects unauthenticated requests before RPC', async () => {
  const h = load('supplier-jobs');
  assert.equal((await h.handler(request('POST', false))).status, 401);
  assert.deepEqual(h.calls, []);
});
test('editorial endpoint stays blocked even with valid worker credentials', async () => {
  const h = load('publicar-agendadas');
  const r = await h.handler(request());
  assert.equal(r.status, 503);
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.deepEqual(h.calls, []);
});
test('editorial endpoint preserves authentication and method guards', async () => {
  const h = load('publicar-agendadas');
  assert.equal((await h.handler(request('POST', false))).status, 401);
  assert.equal((await h.handler(request('GET'))).status, 405);
  assert.deepEqual(h.calls, []);
});
