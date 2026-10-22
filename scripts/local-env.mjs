import { createHmac } from "node:crypto";
import { existsSync, writeFileSync, readFileSync } from "node:fs";
if (existsSync(".env.local")) {
  process.stdout.write(".env.local existente preservado.\n");
  process.exit(0);
}
const compose = readFileSync("infra/local/compose.yml", "utf8");
const localSecret = compose.match(/PGRST_JWT_SECRET: ['"]?([^\s'"]+)/)?.[1];
if (!localSecret)
  throw Error("Configure o segredo do ambiente local fora do Git.");
const header = Buffer.from(
  JSON.stringify({ alg: "HS256", typ: "JWT" }),
).toString("base64url");
const payload = Buffer.from(
  JSON.stringify({ role: "anon", iss: "supabase", exp: 2000000000 }),
).toString("base64url");
const token =
  header +
  "." +
  payload +
  "." +
  createHmac("sha256", localSecret)
    .update(header + "." + payload)
    .digest("base64url");
writeFileSync(
  ".env.local",
  `VITE_SUPABASE_URL=http://127.0.0.1:54321\nVITE_SUPABASE_ANON_KEY=${token}\nVITE_QUOTATION_URL=http://127.0.0.1:8788/quotation\nVITE_LOGIN_URL=http://127.0.0.1:8788/auth-login\n`,
  { mode: 0o600 },
);
process.stdout.write(
  "Ambiente local configurado. Nunca use as chaves locais em produção.\n",
);
