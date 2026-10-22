import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
import { chromium } from "@playwright/test";
const label = process.argv[2] || "current",
  base = "http://127.0.0.1:5180";
const server = spawn("node", ["server.mjs"], {
  env: { ...process.env, PORT: "5180", VITE_SITE_URL: base },
  stdio: "ignore",
});
let chrome;
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base + "/robots.txt")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  const flags = ["--headless", "--no-sandbox", "--disable-dev-shm-usage"];
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (proxy)
    flags.push(
      "--proxy-server=" + proxy,
      "--proxy-bypass-list=localhost;127.0.0.1",
    );
  chrome = await launch({
    chromePath: chromium.executablePath(),
    chromeFlags: flags,
  });
  const { lhr } = await lighthouse(base + "/guia", {
    port: chrome.port,
    onlyCategories: ["performance", "accessibility", "seo"],
    output: "json",
    logLevel: "error",
  });
  if (lhr.runtimeError || lhr.categories.performance.score === null)
    throw Error(lhr.runtimeError?.message || "Medição inválida");
  const result = {
    label,
    date: new Date().toISOString(),
    url: base + "/guia",
    lighthouse: lhr.lighthouseVersion,
    performance: lhr.categories.performance.score * 100,
    accessibility: lhr.categories.accessibility.score * 100,
    seo: lhr.categories.seo.score * 100,
    lcpMs: lhr.audits["largest-contentful-paint"].numericValue,
  };
  mkdirSync("docs/evidence", { recursive: true });
  writeFileSync(
    "docs/evidence/lighthouse-" + label + ".json",
    JSON.stringify(result, null, 2) + "\n",
  );
  writeFileSync(
    "/tmp/patri-lighthouse-" + label + ".json",
    JSON.stringify(lhr),
  );
  console.log(result);
} finally {
  await chrome?.kill();
  server.kill();
}
