import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import prettier from "prettier";
const files = [];
function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, e.name);
    if (e.isDirectory()) walk(path);
    else if (
      /\.(tsx?|css|json)$/.test(path) &&
      !path.endsWith(".test.ts") &&
      path !== "src/entry-server.tsx"
    ) {
      let content = readFileSync(path, "utf8");
      if (path === "src/main.tsx")
        content = content.replaceAll("BrowserRouter", "HashRouter");
      if (path === "src/pages/AuthPage.tsx")
        content = content
          .replace(
            "import { useNavigate }",
            "import { useNavigate, useLocation }",
          )
          .replace(
            "const nav = useNavigate();",
            "const nav = useNavigate();\n  const routeLocation = useLocation();",
          )
          .replaceAll(
            "new URLSearchParams(location.search)",
            "new URLSearchParams(routeLocation.search)",
          );
      if (path === "src/components/Header.tsx")
        content = content.replace(
          '<a href="/#conexoes">{t.connections}</a>',
          '<Link to="/#conexoes">{t.connections}</Link>',
        );
      if (path === "src/pages/Home.tsx")
        content = content
          .replace(
            '<a className="hero-secondary" href="#universo">',
            '<Link className="hero-secondary" to="/#universo">',
          )
          .replace('<a href="#universo">', '<Link to="/#universo">')
          .replaceAll("</a>", "</Link>")
          .replace(
            "/images/architecture-hero.jpg",
            "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=2000&q=85",
          )
          .replace(
            "/images/architecture-detail.jpg",
            "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1000&q=85",
          );
      files.push({ filename: path, content });
    }
  }
}
walk("src");
files.push({
  filename: "src/vite-env.d.ts",
  content: '/// <reference types="vite/client" />\n',
});
files.push({
  filename: "src/App.tsx",
  content: "export {default} from './pages/App';\n",
});
files.push({
  filename: "index.html",
  content: readFileSync("index.html", "utf8").replace(
    'src="/src/',
    'src="./src/',
  ),
});
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
pkg.scripts = { dev: "vite", build: "vite build", preview: "vite preview" };
for (const name of [
  "supabase",
  "@playwright/test",
  "prettier",
  "@types/node",
  "lighthouse",
])
  delete pkg.devDependencies[name];
files.push({ filename: "package.json", content: JSON.stringify(pkg, null, 2) });
files.push({
  filename: "tailwind.config.js",
  content: readFileSync("tailwind.config.js", "utf8"),
});
const tests = JSON.parse(readFileSync("tests/preview-tests.json", "utf8"));
files.push({
  filename: "tests/tests.json",
  content: JSON.stringify(tests, null, 2),
});
JSON.parse(files.at(-1).content);
for (const file of files) {
  if (/\.(ts|tsx|js)$/.test(file.filename))
    file.content = await prettier.format(file.content, {
      parser: file.filename.endsWith("js") ? "babel" : "typescript",
      singleQuote: true,
    });
}
mkdirSync(".preview", { recursive: true });
writeFileSync(".preview/files.json", JSON.stringify(files));
