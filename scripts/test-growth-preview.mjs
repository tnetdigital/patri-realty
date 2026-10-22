import ts from "typescript";
import { readFileSync, writeFileSync } from "node:fs";
const source = readFileSync("tests/e2e/growth-demo.spec.ts", "utf8").replace(
  /import \{ test, expect \} from [^;]+;/,
  "import { chromium, expect } from '@playwright/test';",
);
const harness = `const browser=await chromium.launch({headless:true});async function test(name,run){const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));const original=page.goto.bind(page);page.goto=(path,opts)=>original(path.startsWith('http')?path:'https://patri-realty-previa-05je1j.v2.appdeploy.ai/#'+path,opts);try{await run({page});if(errors.length)throw Error(errors.join('\\n'));console.log(name+': aprovado na prévia pública.');}finally{await page.close();}}\n`;
const code = ts
    .transpileModule(source + "\nvoid chromium;", {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    })
    .outputText.replace(/\btest\(/g, "await test("),
  i = code.indexOf("\n");
writeFileSync(
  ".preview/growth-public.mjs",
  code.slice(0, i + 1) +
    harness +
    code.slice(i + 1) +
    "\nawait browser.close();",
);
await import("../.preview/growth-public.mjs");
