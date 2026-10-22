import ts from "typescript";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const source = readFileSync("tests/e2e/supplier-demo.spec.ts", "utf8").replace(
  /import \{ test, expect \} from [^;]+;/,
  "import { chromium, expect } from '@playwright/test';",
);
const code = ts
  .transpileModule(source + "\nvoid chromium;", {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  })
  .outputText.replace(/\btest\(/g, "await test(");
const harness = `
const browser = await chromium.launch({headless: true});
async function test(name, run) {
  const page = await browser.newPage({viewport: {width: 375, height: 812}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const goto = page.goto.bind(page);
  page.goto = (path, options) => goto(path.startsWith('http') ? path : 'https://patri-realty-previa-05je1j.v2.appdeploy.ai/#' + path, options);
  try {
    await run({page});
    expect(errors).toEqual([]);
    console.log(name + ': aprovado na prévia pública.');
  } finally {
    await page.close();
  }
}
`;
mkdirSync(".preview", { recursive: true });
const firstLine = code.indexOf("\n");
writeFileSync(
  ".preview/supplier-public.mjs",
  code.slice(0, firstLine + 1) +
    harness +
    code.slice(firstLine + 1) +
    "\nawait browser.close();\n",
);
await import("../.preview/supplier-public.mjs");
