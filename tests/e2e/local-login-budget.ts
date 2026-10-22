import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";
// Isolate the explicitly synthetic IP used by the local gateway; preserve account counters.
export function resetLocalLoginBudget() {
  const secret = readFileSync("infra/local/compose.yml", "utf8").match(
    /PGRST_JWT_SECRET: ['"]?([^\s'"]+)/,
  )?.[1];
  if (!secret) throw Error("Stack de testes não configurada");
  const salt = createHmac("sha256", secret)
    .update("login-local-only")
    .digest("hex");
  const key = createHmac("sha256", salt)
    .update("login-ip:local-login")
    .digest("hex");
  execFileSync(
    "docker",
    [
      "exec",
      "patri-local-db-1",
      "psql",
      "-U",
      "postgres",
      "-c",
      `update private.conta_tentativas set criado_em=now()-interval '16 minutes' where chave='${key}'`,
    ],
    { stdio: "ignore" },
  );
}
