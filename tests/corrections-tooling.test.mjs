import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
const read = (p) => readFileSync(p, "utf8");
const pkg = JSON.parse(read("package.json"));
test("F15 typecheck cobre Edge e frontend", () =>
  assert.match(pkg.scripts.typecheck || "", /edge/));
test("F25 lint disponível", () => assert.ok(pkg.scripts.lint));
test("F20 templates separados", () =>
  assert.ok(existsSync("supabase/functions/_shared/email-templates.ts")));
test("F27 exemplo contém ambiente completo", () => {
  for (const v of ["NEWSLETTER_IP_SALT", "BANNER_IP_SALT", "VITE_CHECKOUT_URL"])
    assert.match(read(".env.example"), new RegExp("^" + v + "=", "m"));
});
test("F04 cron por rotina", () =>
  assert.ok(
    readdirSync("supabase/migrations").filter((x) => x.includes("_cron_"))
      .length >= 6,
  ));
test("F21 falhas de rotinas têm tabela", () =>
  assert.ok(
    readdirSync("supabase/migrations").some((x) =>
      read("supabase/migrations/" + x).includes(
        "create table public.rotina_falhas",
      ),
    ),
  ));
test("F22 cada migration tem reversão", () => {
  for (const f of readdirSync("supabase/migrations"))
    assert.ok(
      existsSync("supabase/rollbacks/" + f.replace(".sql", ".down.sql")),
      f,
    );
});
test("F23 buckets revistas e importações", () =>
  assert.ok(
    readdirSync("supabase/migrations").some((x) =>
      /insert into storage.buckets[\s\S]*importacoes/.test(
        read("supabase/migrations/" + x),
      ),
    ),
  ));
