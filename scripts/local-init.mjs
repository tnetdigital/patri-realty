import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
const paths = ["infra/local/compose.yml", "infra/local/bootstrap.sql"];
const existing = paths.map((path) => existsSync(path));
if (existing.every(Boolean)) {
  console.log("Configuração local existente preservada.");
} else {
  if (existing.some(Boolean)) {
    throw new Error(
      "Configuração local incompleta. Restaure o par compose.yml/bootstrap.sql antes de continuar; arquivos existentes foram preservados.",
    );
  }
  const values = {
    __PATRI_LOCAL_DB_PASSWORD__: randomBytes(24).toString("hex"),
    __PATRI_LOCAL_REST_PASSWORD__: randomBytes(24).toString("hex"),
    __PATRI_LOCAL_JWT_SECRET__: randomBytes(32).toString("hex"),
  };
  const templates = [
    "infra/local/compose.example.yml",
    "infra/local/bootstrap.example.sql",
  ];
  const rendered = templates.map((path) => {
    let content = readFileSync(path, "utf8");
    for (const [placeholder, value] of Object.entries(values)) {
      content = content.replaceAll(placeholder, value);
    }
    if (/__PATRI_LOCAL_[A-Z_]+__/.test(content)) {
      throw new Error("Template local contém variável não resolvida.");
    }
    return content;
  });
  paths.forEach((path, index) =>
    writeFileSync(path, rendered[index], { mode: 0o600, flag: "wx" }),
  );
  console.log(
    "Configuração local criada com credenciais aleatórias, excluídas do Git.",
  );
}
