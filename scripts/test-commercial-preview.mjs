import ts from "typescript";
import { readFileSync, writeFileSync } from "node:fs";
const source = readFileSync(
  "tests/e2e/commercial-demo.spec.ts",
  "utf8",
).replace(
  /import \{ test, expect \} from [^;]+;/,
  "import { chromium, expect } from '@playwright/test';",
);
const harness = `const browser = await chromium.launch({headless:true});
async function test(name, run) { if(process.env.ONLY_HIGHLIGHTS && !name.includes("três"))return;const page = await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));const original=page.goto.bind(page);page.goto=(path,opts)=>original(path.startsWith('http')?path:'https://patri-realty-previa-05je1j.v2.appdeploy.ai/#'+path,opts);try{await run({page});if(errors.length)throw Error(errors.join('\\n'));console.log(name+': aprovado na prévia pública.');}catch(e){console.log(await page.locator('form input,form select').evaluateAll(es=>es.filter(e=>!e.validity.valid).map(e=>({label:e.getAttribute('aria-label')||e.closest('label')?.innerText.slice(0,40),value:e.value,validation:e.validationMessage}))));throw e;}finally{await page.close();}}
`;
const code = ts
  .transpileModule(source + "\nvoid chromium;", {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  })
  .outputText.replace(/\btest\(/g, "await test(");
const idx = code.indexOf("\n");
writeFileSync(
  ".preview/commercial-public.mjs",
  code.slice(0, idx + 1) +
    harness +
    code.slice(idx + 1) +
    "\nawait browser.close();\n",
);
await import("../.preview/commercial-public.mjs");
