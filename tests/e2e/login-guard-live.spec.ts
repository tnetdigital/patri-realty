import { resetLocalLoginBudget } from "./local-login-budget";
import { test, expect } from "@playwright/test";
import { loadEnv } from "vite";
import { execFileSync } from "node:child_process";
test.skip(process.env.PATRI_LIVE_TESTS !== "1", "Requer Auth local");
const sql = (s: string) =>
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      "patri-local-db-1",
      "psql",
      "-U",
      "postgres",
      "-At",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    { input: s, encoding: "utf8" },
  ).trim();
test("Auth direto bloqueia senha após cinco falhas e libera após a janela", async () => {
  const env = loadEnv("development", process.cwd(), ""),
    email = `guard-${Date.now()}@example.com`;
  const headers = {
    apikey: env.VITE_SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
  };
  const response = await fetch("http://127.0.0.1:54321/auth/v1/signup", {
    method: "POST",
    headers,
    body: JSON.stringify({
      email,
      password: "TestePatri2026!",
      data: {
        nome: "Pessoa Segurança",
        tipo: "sindico",
        cidade: "São Paulo",
        estado: "SP",
        termos: true,
        termos_versao: "2026-10-21",
        privacidade_versao: "2026-10-21",
      },
    }),
  });
  expect(response.ok).toBe(true);
  const user = await response.json();
  sql(`update auth.users set email_confirmed_at=now() where id='${user.id}'`);
  const login = (password: string) =>
    fetch("http://127.0.0.1:54321/auth/v1/token?grant_type=password", {
      method: "POST",
      headers,
      body: JSON.stringify({ email, password }),
    });
  for (let n = 0; n < 5; n++)
    expect((await login("SenhaErrada123")).ok).toBe(false);
  expect(
    sql(`select count(*) from private.login_falhas where user_id='${user.id}'`),
  ).toBe("5");
  const blocked = await login("TestePatri2026!");
  expect(blocked.ok).toBe(false);
  expect(JSON.stringify(await blocked.json())).not.toContain("access_token");
  sql(
    `update private.login_falhas set criado_em=now()-interval '16 minutes' where user_id='${user.id}'`,
  );
  expect((await login("TestePatri2026!")).ok).toBe(true);
});

test.beforeEach(() => resetLocalLoginBudget());
