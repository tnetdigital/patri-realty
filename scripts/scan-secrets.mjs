import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
    .split("\0")
    .filter(Boolean),
  hits = [];
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:sk_live_|sk_test_|rk_live_|whsec_|re_)[A-Za-z0-9]{24,}\b/,
  /\beyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{40,}\.[A-Za-z0-9_-]{30,}\b/,
];
for (const file of files) {
  let s;
  try {
    s = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (patterns.some((p) => p.test(s))) hits.push(file);
}
if (hits.length) {
  console.error("Possíveis segredos: " + hits.join(", "));
  process.exit(1);
}
console.log("Nenhum padrão de segredo nos arquivos versionados.");
