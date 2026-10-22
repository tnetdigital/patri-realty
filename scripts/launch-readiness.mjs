import { loadEnv } from "vite";
const env = { ...loadEnv("production", process.cwd(), ""), ...process.env };
const checks = [];
const check = (name, pass) =>
  checks.push({ name, status: pass ? "OK" : "PENDENTE" });
for (const name of [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RESEND_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "VITE_STRIPE_PUBLISHABLE_KEY",
  "TURNSTILE_SECRET_KEY",
  "VITE_TURNSTILE_SITE_KEY",
  "SITE_URL",
  "EMAIL_FROM",
  "SUPPLIER_JOBS_SECRET",
  "QUOTATION_IP_SALT",
  "EVENT_IP_SALT",
  "ACCOUNT_IP_SALT",
  "VITE_LOGIN_URL",
])
  check(name, Boolean(env[name]?.trim()));
for (const name of ["SITE_URL", "VITE_SUPABASE_URL", "VITE_LOGIN_URL"])
  check(
    name + " público HTTPS",
    /^https:\/\//.test(env[name] || "") &&
      !/localhost|127\.0\.0\.1|example\.(com|org)/.test(env[name] || ""),
  );
check(
  "SMTP com domínio próprio verificado",
  env.EMAIL_DOMAIN_VERIFIED === "true",
);
check(
  "Stripe homologado na conta de produção/teste",
  env.STRIPE_VERIFIED === "true",
);
check(
  "Auth: hook nativo + limite IP + inatividade + confirmação de e-mail + CAPTCHA verificados",
  env.AUTH_GUARDS_VERIFIED === "true",
);
check("Cron e fila de privacidade monitorados", env.JOBS_VERIFIED === "true");
check(
  "Backups e reaplicação de exclusões testados",
  env.BACKUPS_VERIFIED === "true",
);
try {
  const url = env.VITE_SUPABASE_URL,
    key = env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw Error("configuration");
  const result = await fetch(
    url + "/rest/v1/configuracoes?chave=eq.identidade_legal&select=valor",
    {
      headers: { apikey: key, Authorization: "Bearer " + key },
      signal: AbortSignal.timeout(5000),
    },
  );
  const rows = result.ok ? await result.json() : [];
  const legal = rows[0]?.valor || {};
  check(
    "Operador, CNPJ, canal de privacidade e revisão jurídica",
    Boolean(
      legal.razao_social &&
      legal.cnpj &&
      legal.email_privacidade &&
      legal.revisado === true,
    ),
  );
} catch {
  check("Operador, CNPJ, canal de privacidade e revisão jurídica", false);
}
for (const c of checks) console.log(c.status + " — " + c.name);
const missing = checks.filter((c) => c.status === "PENDENTE").length;
console.log(
  missing
    ? "Lançamento com dados reais bloqueado: " +
        missing +
        " verificações pendentes."
    : "Pré-requisitos de lançamento verificados. Execute a homologação final no ambiente de destino.",
);
process.exitCode = missing ? 1 : 0;
