import { readFileSync, readdirSync } from "node:fs";
const walk = (p) =>
  readdirSync(p, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(p + "/" + e.name) : [p + "/" + e.name],
  );
const known = new Set(
  [...readFileSync(".env.example", "utf8").matchAll(/^(\w+)=/gm)].map(
    (x) => x[1],
  ),
);
let missing = new Set();
for (const file of [
  "server.mjs",
  ...["src", "scripts", "supabase/functions"].flatMap(walk),
].filter((x) => /\.(ts|tsx|mjs|js)$/.test(x))) {
  const text = readFileSync(file, "utf8");
  for (const x of text.matchAll(
    /(?:import\.meta\.env\.|process\.env\.|Deno\.env\.get\(['"])([A-Z][A-Z0-9_]+)/g,
  ))
    if (!known.has(x[1]) && !["PROD", "DEV", "MODE", "BASE_URL"].includes(x[1]))
      missing.add(x[1]);
}
if (missing.size) {
  console.error("Variáveis sem exemplo: " + [...missing].sort().join(", "));
  process.exit(1);
}
console.log("Contrato de ambiente completo.");
