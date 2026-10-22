import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { build } from 'vite';
import react from '@vitejs/plugin-react';

// The confidential input is deliberately outside this public Git repository.
const input = process.argv[2];
if (!input) throw new Error('Informe o caminho privado dos rascunhos.');
const drafts = JSON.parse(await readFile(input, 'utf8'));
if (!Array.isArray(drafts))
  throw new Error('A fonte privada precisa ser uma lista.');
await mkdir('.preview', { recursive: true });
await writeFile(
  '.preview/private.html',
  '<!doctype html><html lang="pt-BR"><head><title>Patri Realty</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>',
);
const result = await build({
  configFile: false,
  envDir: resolve('.preview'),
  envPrefix: 'PATRI_NO_PUBLIC_ENV_',
  plugins: [
    {
      name: 'patri-private-preview-adapter',
      enforce: 'pre',
      transform(code, id) {
        if (id.replaceAll('\\', '/').endsWith('/src/main.tsx'))
          return code
            .replaceAll('BrowserRouter', 'HashRouter')
            .replace(
              'const legacyHashRouting = false;',
              'const legacyHashRouting = true;',
            );
        if (id.replaceAll('\\', '/').endsWith('/src/pages/Home.tsx'))
          return code
            .replaceAll(
              '/images/architecture-hero.jpg',
              'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=2000&q=85',
            )
            .replaceAll(
              '/images/architecture-detail.jpg',
              'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1000&q=85',
            );
      },
    },
    react(),
  ],
  build: {
    write: false,
    cssCodeSplit: false,
    sourcemap: false,
    rollupOptions: {
      input: resolve('.preview/private.html'),
      output: { inlineDynamicImports: true },
    },
  },
});
const output = (Array.isArray(result) ? result[0] : result).output;
const js = output
  .filter((file) => file.type === 'chunk')
  .map((file) => file.code)
  .join('\n')
  .replace(/<\/script/gi, '<\\/script');
const css = output
  .filter((file) => file.type === 'asset' && file.fileName.endsWith('.css'))
  .map((file) => String(file.source))
  .join('\n');
const state = JSON.stringify(drafts).replaceAll('<', '\\u003c');
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="referrer" content="no-referrer"><base href="https://patri-realty-previa-05je1j.v2.appdeploy.ai/"><title>Patri Realty — revisão protegida</title><style>${css}</style></head><body><div id="root"></div><script>window.__PATRI_EDITORIAL_REVIEW__=${state};</script><script type="module">${js}</script></body></html>`;
await mkdir('.private-build', { recursive: true });
await writeFile('.private-build/preview.html', html);
const encoded = gzipSync(Buffer.from(html)).toString('base64');
const segments = encoded.match(/.{1,120}/g) || [];
const generated = `// Generated private deployment artifact. Never commit this file.\nimport { gunzipSync } from 'node:zlib';\nconst packed = [\n${segments.map((part) => `  '${part}',`).join('\n')}\n].join('');\nexport function readPrivatePreview(): string {\n  return gunzipSync(Buffer.from(packed, 'base64')).toString('utf8');\n}\n`;
await writeFile('backend/private-preview.generated.ts', generated);

// Only this small access shell is shipped as public frontend source.
const shell = await readFile('preview-host/Access.tsx', 'utf8');
const cssShell = await readFile('preview-host/access.css', 'utf8');
const entry =
  "import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport Access from './Access';\nReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><Access /></React.StrictMode>);\n";
const files = [
  { filename: 'src/main.tsx', content: entry },
  { filename: 'src/Access.tsx', content: shell },
  { filename: 'src/access.css', content: cssShell },
  {
    filename: 'index.html',
    content:
      '<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta name="robots" content="noindex,nofollow,noarchive">\n<meta name="referrer" content="no-referrer">\n<title>Patri Realty — prévia restrita</title>\n</head>\n<body><div id="root"></div><script type="module" src="./src/main.tsx"></script></body>\n</html>\n',
  },
  {
    filename: 'backend/index.ts',
    content: await readFile('backend/index.ts', 'utf8'),
  },
  {
    filename: 'backend/preview-handler.mjs',
    content: await readFile('backend/preview-handler.mjs', 'utf8'),
  },
  {
    filename: 'server/preview-access.mjs',
    content: await readFile('server/preview-access.mjs', 'utf8'),
  },
  { filename: 'backend/private-preview.generated.ts', content: generated },
];
files.push({
  filename: 'src/App.tsx',
  content: "export { default } from './Access';\n",
});
const tests = [
  {
    name: 'Prévia anônima não distribui o portal',
    sanity: true,
    viewport: 'desktop',
    covers: [
      'acesso anônimo negado',
      'rota antiga protegida',
      'ausência de conteúdo antes da senha',
    ],
    description:
      'Confirma que a entrada e os antigos fragmentos mostram somente a tela de acesso.',
    steps: [
      'Abra a raiz sem informar senha.',
      'Confira Prévia restrita e Senha de revisão.',
      'Abra #/previa-editorial e depois #/guia sem preencher senha.',
    ],
    expected:
      'Permanece na tela de senha, sem cards de fornecedores ou textos editoriais. Nenhum iframe de revisão é exibido.',
  },
  {
    name: 'Senha incorreta é recusada pelo servidor',
    viewport: 'desktop',
    covers: [
      'POST /api/preview/open',
      'validação da senha no backend',
      'erro de autenticação visível',
    ],
    description:
      'Exercita uma tentativa inválida e comprova que ela não libera o documento privado.',
    steps: [
      'Abra a raiz.',
      'Preencha Senha de revisão com EstaSenhaNaoAutorizaRevisao2026.',
      'Clique Acessar prévia.',
    ],
    expected:
      'Uma mensagem de erro de acesso fica visível. A tela de senha permanece, sem portal e sem rascunhos.',
  },
  {
    name: 'Proteção permanece após recarga no celular',
    viewport: 'mobile',
    covers: [
      'formulário mobile',
      'estado não autenticado após recarga',
      'sem senha no endereço',
    ],
    description:
      'Confirma a usabilidade do acesso móvel e que atualizar não abre a revisão.',
    steps: [
      'Abra a raiz no celular.',
      'Digite uma senha incorreta e use Acessar prévia.',
      'Recarregue a página.',
    ],
    expected:
      'O campo de senha e o botão cabem na largura da tela. Após recarga o campo está vazio e a revisão continua bloqueada. O endereço não contém senha.',
  },
];
files.push({
  filename: 'tests/tests.json',
  content: JSON.stringify(tests, null, 2),
});
await writeFile('.preview/protected-files.json', JSON.stringify(files));
const publicSources = [entry, shell, cssShell];
for (const item of drafts) {
  if (
    publicSources.some(
      (source) => source.includes(item.title) || source.includes(item.answer),
    )
  )
    throw new Error('Dado privado no acesso público.');
}
console.log(
  JSON.stringify({
    draftCount: drafts.length,
    privateHtmlBytes: Buffer.byteLength(html),
    privateGzipBytes: Buffer.byteLength(encoded, 'base64'),
    publicAccessSourceBytes: publicSources.reduce(
      (n, file) => n + Buffer.byteLength(file),
      0,
    ),
    generatedPrivateModule: true,
  }),
);
