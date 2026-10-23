import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "vite";
import { chromium } from "@playwright/test";
const base = "http://127.0.0.1:15190";
Object.assign(process.env, {
  VITE_SUPABASE_URL: "http://127.0.0.1:15192",
  VITE_SUPABASE_ANON_KEY: "fixture-public-key",
  VITE_QUOTATION_URL: "http://127.0.0.1:8788/quotation",
  VITE_NEWSLETTER_URL: "http://127.0.0.1:8788/newsletter",
  VITE_EVENT_URL: "http://127.0.0.1:8788/event",
  VITE_CAPTCHA_ENABLED: "false",
  VITE_TURNSTILE_SITE_KEY: "",
});
await mkdir(".preview", { recursive: true });
await writeFile(
  ".preview/pt11.html",
  '<html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/\.preview/pt11.tsx"></script></body></html>',
);
await writeFile(
  ".preview/pt11.tsx",
  `
import React from 'react';import{createRoot}from'react-dom/client';
import{MemoryRouter,Routes,Route}from'react-router-dom';
import{QueryClient,QueryClientProvider}from'@tanstack/react-query';
import{DirectoryContext,catalogKey,searchKey}from'../src/features/directory/api';
import{demoSuppliers}from'../src/features/directory/fixtures';
import{QuotationForm}from'../src/features/quotations/Form';import{NewsletterForm}from'../src/features/content/Newsletter';
import AuthPage from'../src/pages/AuthPage';import{AuthProvider}from'../src/features/auth/context';
import '../src/mobile.css';
const segment={id:'12000000-0000-4000-8000-000000000001',slug:'teste',nome:'Especialidade QA',quantidade:1};
const s={...demoSuppliers[0],id:'11000000-0000-4000-8000-000000000001',slug:'qa',nome_fantasia:'Fornecedor controlado',segmentos:[segment]};
const r={source:'live',url:'http://127.0.0.1:15192',key:'fixture',siteUrl:'${base}',hashRouting:false};
const c=new QueryClient({defaultOptions:{queries:{retry:false,staleTime:Infinity}}});
c.setQueryData(catalogKey(r),{segmentos:[segment],estados:[{uf:'SP',nome:'São Paulo'}],cidades:[]});
c.setQueryData(searchKey(r,{segmento:'teste',q:'',uf:'',cidade:'',pagina:1,ordem:'nome'}),{items:[s],total:1,paginas:1});
const auth=location.search.includes('register');
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={c}><DirectoryContext.Provider value={r as any}><MemoryRouter initialEntries={[auth?'/cadastrar?tipo=fornecedor':'/fornecedor/qa']}><AuthProvider>{auth?<Routes><Route path='/cadastrar' element={<AuthPage mode='register'/>}/><Route path='/confirmar-email' element={<h1>Confirmação de e-mail pendente</h1>}/></Routes>:<><QuotationForm supplier={s as any}/><NewsletterForm demo={false}/></>}</AuthProvider></MemoryRouter></DirectoryContext.Provider></QueryClientProvider>);
`,
);
const server = await createServer({
  server: { host: "127.0.0.1", port: 15190, strictPort: true },
  logLevel: "error",
});
await server.listen();
let browser;
const checks = [];
let quoteBodies = [],
  newsBodies = [],
  events = [],
  signupBodies = [];
let quoteMode = "accepted",
  newsMode = "accepted",
  signupMode = "accepted",
  delay = 0;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });
  await context.route("**/*", async (route) => {
    const url = route.request().url();
    if (url.startsWith(base)) return route.continue();
    if (url.includes(":8788/event")) {
      events.push(route.request().postDataJSON());
      return route.abort("failed");
    }
    if (url.includes(":8788/quotation") || url.includes(":8788/newsletter")) {
      const quote = url.endsWith("/quotation");
      (quote ? quoteBodies : newsBodies).push(route.request().postDataJSON());
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      const mode = quote ? quoteMode : newsMode;
      return route.fulfill({
        status: mode === "failed" ? 503 : 200,
        contentType: "application/json",
        body: JSON.stringify(
          mode === "failed"
            ? { error: "Falha controlada; tente novamente" }
            : mode === "empty"
              ? {}
              : { recebido: true },
        ),
      });
    }
    if (url.includes("/auth/v1/signup")) {
      signupBodies.push(route.request().postDataJSON());
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      return route.fulfill({
        status: signupMode === "failed" ? 400 : 200,
        contentType: "application/json",
        body: JSON.stringify(
          signupMode === "failed"
            ? { msg: "Falha controlada" }
            : {
                user: {
                  id: "13000000-0000-4000-8000-000000000001",
                  email: "qa@example.test",
                },
                session: null,
              },
        ),
      });
    }
    if (url.includes("/rest/v1/rpc/document_version"))
      return route.fulfill({ json: "fixture-version" });
    if (url.includes("/rest/v1/")) return route.fulfill({ json: [] });
    return route.abort("blockedbyclient");
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const open = async () => {
    await page.goto(base + "/.preview/pt11.html");
    await page.locator(".quotation-form").waitFor();
  };
  const fillQuote = async () => {
    const f = page.locator(".quotation-form");
    for (const [name, value] of Object.entries({
      nome: "Pessoa QA",
      email: "qa@example.test",
      telefone: "11999999999",
      condominio_nome: "Condomínio QA",
      cidade: "Cidade QA",
      unidades: "12",
      mensagem: "Solicitação inteiramente sintética para teste controlado.",
    }))
      await f.locator("[name=" + name + "]").fill(value);
    await f.locator("[name=uf]").selectOption("SP");
    await f.locator("[name=privacidade]").check();
    return f;
  };
  const submitTwice = async (f) =>
    f.evaluate((el) => {
      el.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      el.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
  await open();
  await page.evaluate(() => localStorage.setItem("patri:consent", "essential"));
  const initialCount = quoteBodies.length;
  await page.locator(".quotation-form button").click();
  assert.equal(quoteBodies.length, initialCount);
  assert.equal(
    await page.evaluate(() => document.activeElement?.getAttribute("name")),
    "nome",
  );
  await page.locator(".quotation-form [name=email]").focus();
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() => document.activeElement?.getAttribute("name")),
    "telefone",
  );
  checks.push({
    name: "375px: validação mantém foco no erro e campos navegáveis pelo teclado",
    passed: true,
  });
  let f = await fillQuote();
  quoteMode = "empty";
  delay = 200;
  await submitTwice(f);
  await page
    .getByRole("alert")
    .filter({ hasText: "confirmar o recebimento" })
    .waitFor();
  assert.equal(quoteBodies.length, 1);
  assert.equal(events.length, 0);
  assert.equal(
    await page.getByText("Pedido registrado.", { exact: true }).count(),
    0,
  );
  checks.push({
    name: "orçamento: clique duplo e resposta 200 vazia não geram sucesso ou evento",
    passed: true,
  });
  const firstId = quoteBodies[0].request_id;
  await page.reload();
  await page.locator(".quotation-form").waitFor();
  assert.equal(quoteBodies.length, 1);
  f = await fillQuote();
  quoteMode = "accepted";
  delay = 0;
  await submitTwice(f);
  await page.getByText("Pedido registrado.", { exact: true }).waitFor();
  assert.equal(quoteBodies.length, 2);
  assert.equal(quoteBodies[1].request_id, firstId);
  assert.equal(
    quoteBodies[1].fornecedor_id,
    "11000000-0000-4000-8000-000000000001",
  );
  assert.equal(
    quoteBodies[1].segmento_id,
    "12000000-0000-4000-8000-000000000001",
  );
  assert.equal(quoteBodies[1].uf, "SP");
  assert.equal(events.length, 0);
  checks.push({
    name: "refresh não reenvia e retentativa conserva chave, fornecedor, segmento e localidade; analytics recusado",
    passed: true,
  });
  await open();
  await page.evaluate(() => localStorage.setItem("patri:consent", "analytics"));
  f = await fillQuote();
  delay = 800;
  const before = quoteBodies.length;
  await submitTwice(f);
  assert.equal(
    await page.getByText("Pedido registrado.", { exact: true }).count(),
    0,
  );
  await page.getByText("Pedido registrado.", { exact: true }).waitFor();
  await page.waitForFunction(() =>
    document.cookie.includes("patri_analytics="),
  );
  assert.equal(quoteBodies.length, before + 1);
  assert.equal(events.length, 1);
  assert.equal(events[0].etype, "orcamento_enviado");
  assert.equal(events[0].segment, "12000000-0000-4000-8000-000000000001");
  assert.equal(events[0].region, "SP");
  assert.ok(!JSON.stringify(events).includes("qa@example.test"));
  checks.push({
    name: "rede lenta e analytics indisponível: sucesso só após recibo; evento sem dados pessoais",
    passed: true,
  });
  const news = page
    .locator("section")
    .filter({
      has: page.getByRole("heading", {
        name: "Boas conexões também chegam por e-mail",
      }),
    })
    .locator("form");
  await news.locator("[name=nome]").fill("Pessoa QA");
  await news.locator("[name=email]").fill("qa@example.test");
  assert.equal(await news.locator("[name=aceite]").isChecked(), false);
  await news.locator("[name=aceite]").check();
  newsMode = "empty";
  delay = 100;
  await submitTwice(news);
  await page
    .getByRole("alert")
    .filter({ hasText: "confirmar o recebimento" })
    .waitFor();
  assert.equal(newsBodies.length, 1);
  assert.equal(
    await page.getByText("Se aplicável, enviaremos", { exact: false }).count(),
    0,
  );
  checks.push({
    name: "newsletter: aceite separado, clique duplo e falha sem falso duplo aceite",
    passed: true,
  });
  newsMode = "accepted";
  delay = 0;
  await submitTwice(news);
  await page.getByText("Se aplicável, enviaremos", { exact: false }).waitFor();
  assert.equal(newsBodies.length, 2);
  assert.equal(
    await page
      .getByRole("button", { name: "Solicitar inscrição" })
      .isDisabled(),
    true,
  );
  assert.equal(events.length, 1);
  checks.push({
    name: "newsletter aceita permanece pendente de confirmação, sem evento de lead",
    passed: true,
  });
  await page.goto(base + "/.preview/pt11.html?register");
  const reg = page.locator("form");
  await reg.locator("[name=nome]").fill("Pessoa QA");
  await reg.locator("[name=email]").fill("qa@example.test");
  await reg.locator("[name=senha]").fill("TesteQA12345");
  await reg.locator("[name=telefone]").fill("11999999999");
  await reg.locator("[name=empresa]").fill("Empresa QA");
  await reg.locator("[name=cnpj]").fill("11222333000181");
  await reg.locator("[name=termos]").check();
  assert.equal(await reg.locator("[name=newsletter]").isChecked(), false);
  signupMode = "failed";
  delay = 0;
  await submitTwice(reg);
  await page.waitForFunction(() => {
    const button = document.querySelector("form button");
    return (
      button &&
      !button.hasAttribute("disabled") &&
      document.body.textContent?.includes("Não foi possível concluir")
    );
  });
  assert.equal(
    await reg.locator("[name=email]").inputValue(),
    "qa@example.test",
  );
  assert.equal(
    await page
      .getByRole("heading", { name: "Confirmação de e-mail pendente" })
      .count(),
    0,
  );
  signupMode = "accepted";
  delay = 800;
  await submitTwice(reg);
  await page
    .getByRole("heading", { name: "Confirmação de e-mail pendente" })
    .waitFor();
  assert.equal(signupBodies.length, 2);
  assert.equal(signupBodies[0].data.newsletter, false);
  checks.push({
    name: "cadastro: falha recuperável, um envio por tentativa, marketing desmarcado e confirmação pendente",
    passed: true,
  });
  assert.deepEqual(errors, []);
  checks.push({
    name: "sem exceções de JavaScript ou falhas de mensuração propagadas",
    passed: true,
  });
  await mkdir("docs/seo/evidencias-prompt11", { recursive: true });
  await writeFile(
    "docs/seo/evidencias-prompt11/qa.json",
    JSON.stringify(
      {
        controlled: true,
        realPersistenceTested: false,
        externalEmailsSent: false,
        chargesMade: false,
        viewport: { width: 375, height: 812 },
        passed: checks.length,
        checks,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
} finally {
  await browser?.close();
  await server.close();
}
