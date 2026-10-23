import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

const folder = await mkdtemp(join(tmpdir(), 'patri-review-'));
const file = join(folder, 'review.json');
await writeFile(
  file,
  JSON.stringify([{ slug: 'private-canary', status: 'rascunho' }]),
);
const password = randomUUID() + randomUUID();
const base = 'http://127.0.0.1:15181';
const server = spawn(process.execPath, ['server.mjs'], {
  env: {
    ...process.env,
    PORT: '15181',
    VITE_SITE_URL: base,
    VITE_SUPABASE_URL: '',
    VITE_SUPABASE_ANON_KEY: '',
    PATRI_PREVIEW_MODE: 'true',
    PREVIEW_ACCESS_PASSWORD: password,
    PATRI_EDITORIAL_REVIEW_FILE: file,
  },
  windowsHide: true,
  stdio: 'ignore',
});
const checks = [];
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base)).status === 401) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((done) => setTimeout(done, 100));
  }
  assert.ok(ready, 'Servidor protegido disponível');
  const index = await readFile('dist/index.html', 'utf8');
  const asset = index.match(/src="(\/assets\/[^" ]+\.js)"/)?.[1];
  assert.ok(asset, 'Asset real do build encontrado');
  for (const path of [
    '/',
    '/previa-editorial',
    '/api/editorial-review',
    asset,
    '/robots.txt',
    '/sitemap.xml',
    '/feed.xml',
    '/src/data/editorial-drafts.json',
  ]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 401, path);
    assert.match(response.headers.get('cache-control'), /private, no-store/);
    assert.ok(!(await response.text()).includes('private-canary'));
    checks.push({ path, status: 401, anonymousDenied: true });
  }
  const authorization =
    'Basic ' + Buffer.from('revisao:' + password).toString('base64');
  for (const path of ['/', asset, '/api/editorial-review']) {
    const response = await fetch(base + path, { headers: { authorization } });
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('cache-control'), /private, no-store/);
    assert.match(response.headers.get('x-robots-tag'), /noindex/);
    if (path === '/api/editorial-review')
      assert.equal((await response.json())[0].slug, 'private-canary');
    checks.push({ path, status: 200, authorized: true });
  }
  for (const path of ['/robots.txt', '/sitemap.xml']) {
    const response = await fetch(base + path, { headers: { authorization } });
    assert.equal(response.status, 200);
    const text = await response.text();
    assert.match(response.headers.get('x-robots-tag'), /noindex/);
    if (path === '/robots.txt') {
      assert.match(text, /Disallow: \//);
      assert(!text.includes('Sitemap:'));
    } else assert(!text.includes('<loc>'));
    checks.push({ path, authorizedDiscoveryEmpty: true });
  }
  const bot = await fetch(base + '/sitemap.xml', {
    headers: { 'User-Agent': 'Googlebot' },
  });
  assert.equal(bot.status, 401);
  checks.push({ path: '/sitemap.xml', spoofedBotDenied: true });
  const refused = await fetch(base + '/api/editorial-review', {
    headers: {
      authorization: 'Basic ' + Buffer.from('revisao:wrong').toString('base64'),
    },
  });
  assert.equal(refused.status, 401);
  checks.push({
    path: '/api/editorial-review',
    invalidPasswordDenied: true,
    status: refused.status,
  });
  console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
} finally {
  server.kill();
  await rm(folder, { recursive: true });
}
