import { spawn, execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
const owner = randomUUID(),
  reader = randomUUID(),
  rid = randomUUID(),
  slug = "growth-ssr-" + Date.now();
let sid = "";
let cnpj = String(Date.now()).slice(-12);
for (let n = 12; n <= 13; n++) {
  let w = n - 7;
  const sum = [...cnpj].reduce((a, d) => {
    const b = a + Number(d) * w;
    w = w === 2 ? 9 : w - 1;
    return b;
  }, 0);
  cnpj += sum % 11 < 2 ? 0 : 11 - (sum % 11);
}
const sql = (s) =>
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      "patri-local-db-1",
      "psql",
      "-U",
      "postgres",
      "-Atq",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    { input: s, encoding: "utf8" },
  ).trim();
const server = spawn("node", ["server.mjs"], {
  env: { ...process.env, PORT: "5178", VITE_SITE_URL: "http://127.0.0.1:5178" },
  stdio: "ignore",
});
try {
  sql(
    `insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values('${owner}','${owner}@example.com',now(),'{"nome":"Fornecedor SSR","tipo":"fornecedor","empresa":"Empresa SSR","cnpj":"${cnpj}","telefone":"11988887777","termos":true,"termos_versao":"2026-10-19","privacidade_versao":"2026-10-19"}'),('${reader}','${reader}@example.com',now(),'{"nome":"Leitor SSR","tipo":"sindico","cidade":"São Paulo","estado":"SP","termos":true,"termos_versao":"2026-10-19","privacidade_versao":"2026-10-19"}');`,
  );
  sid = sql(`select id from public.fornecedores where dono_id='${owner}'`);
  sql(
    `update public.fornecedores set status='publicado',slug='${slug}',descricao_curta='Perfil para validar reputação no SSR.' where id='${sid}';insert into public.avaliacoes(id,fornecedor_id,autor_id,nota,titulo,texto) values('${rid}','${sid}','${reader}',4,'Atendimento organizado','Relato de integração com informações detalhadas sobre os serviços e atendimento no condomínio.');`,
  );
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch("http://127.0.0.1:5178/robots.txt")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  const url = "http://127.0.0.1:5178/fornecedor/" + slug;
  let html = await (await fetch(url)).text();
  assert.ok(
    !html.includes("AggregateRating"),
    "pendente não gera avaliação estruturada",
  );
  sql(`update public.avaliacoes set status='publicada' where id='${rid}'`);
  html = await (await fetch(url)).text();
  assert.ok(
    !html.includes("AggregateRating"),
    "DTO agregado não comprova elegibilidade do recurso; sem markup de nota",
  );
  assert.ok(html.replace(/<[^>]*>/g, "").includes("4 / 5"), "nota pública permanece visível");
  assert.ok(html.replace(/<[^>]*>/g, "").includes("1 avaliações publicadas"));
  sql(`update public.avaliacoes set status='removida' where id='${rid}'`);
  html = await (await fetch(url)).text();
  assert.ok(
    !html.includes("AggregateRating"),
    "removida sai imediatamente do schema",
  );
  console.log(
    "Reputação SSR: notas públicas preservadas; AggregateRating suprimido sem prova completa de elegibilidade.",
  );
} finally {
  server.kill();
  if (sid) sql(`delete from public.avaliacoes where fornecedor_id='${sid}';`);
  sql(
    `update public.profiles set ativo=false where id in ('${owner}','${reader}');`,
  );
}
