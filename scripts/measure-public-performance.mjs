import { createHash } from "node:crypto";
import { chromium } from "@playwright/test";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { cpus, platform, release } from "node:os";
import { execFileSync } from "node:child_process";
import { performanceFixture, isolateRequests } from "./performance-fixture.mjs";
const phase = process.argv[2];
if (!["before", "after"].includes(phase)) throw Error("Use before ou after");
const h = await performanceFixture();
let browser;
const routes = [
  ["guide", "/guia/teste"],
  ["profile", "/fornecedor/synthetic-0"],
  ["article", "/materia/desempenho-qa"],
];
const samples = [],
  audits = [];
const folder = "docs/seo/evidencias-prompt12";
await mkdir(folder, { recursive: true });
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  for (const [family, path] of routes.filter(
    ([f]) => !process.argv[3] || process.argv[3] === f,
  )) {
    for (let run = 1; run <= 3; run++) {
      const context = await browser.newContext({
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
      });
      await isolateRequests(context, h.base);
      await context.addInitScript(() => {
        localStorage.setItem("patri:consent", "essential");
        const state = {
          lcp: 0,
          lcpElement: "",
          cls: 0,
          windowScore: 0,
          first: 0,
          last: 0,
          longTasks: 0,
          shifts: [],
        };
        window.__pt12 = state;
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            state.lcp = e.startTime;
            state.lcpElement = e.element?.tagName + "." + e.element?.className;
          }
        }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            if (e.hadRecentInput) continue;
            state.shifts.push({
              time: e.startTime,
              value: e.value,
              sources: e.sources.map((s) => ({
                node: s.node?.tagName + "." + s.node?.className,
                before: s.previousRect.toJSON(),
                after: s.currentRect.toJSON(),
              })),
            });
            if (
              e.startTime - state.last > 1000 ||
              e.startTime - state.first > 5000
            ) {
              state.first = e.startTime;
              state.windowScore = e.value;
            } else state.windowScore += e.value;
            state.last = e.startTime;
            state.cls = Math.max(state.cls, state.windowScore);
          }
        }).observe({ type: "layout-shift", buffered: true });
        new PerformanceObserver((list) => {
          for (const e of list.getEntries())
            state.longTasks += Math.max(0, e.duration - 50);
        }).observe({ type: "longtask", buffered: true });
      });
      const page = await context.newPage(),
        cdp = await context.newCDPSession(page);
      let hydrationErrors = 0;
      const pageErrors = [];
      page.on("pageerror", (error) => {
        pageErrors.push(error.message.slice(0, 800));
        if (/React|hydrat/i.test(error.message)) hydrationErrors++;
      });
      page.on("console", (m) => {
        if (/hydrat|Minified React error #4/i.test(m.text())) {
          hydrationErrors++;
          pageErrors.push(m.text().slice(0, 800));
        }
      });
      await cdp.send("Network.enable");
      await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 150,
        downloadThroughput: 1600000 / 8,
        uploadThroughput: 750000 / 8,
        connectionType: "cellular4g",
      });
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      const response = await page.goto(h.base + path, {
        waitUntil: "networkidle",
      });
      await page.waitForTimeout(1500);
      const stats = await page.evaluate(() => {
        const n = performance.getEntriesByType("navigation")[0],
          r = performance.getEntriesByType("resource");
        const js = r.filter((x) => new URL(x.name).pathname.endsWith(".js")),
          css = r.filter((x) => new URL(x.name).pathname.endsWith(".css"));
        return {
          ...window.__pt12,
          ttfb: n.responseStart,
          domContentLoaded: n.domContentLoadedEventEnd,
          htmlEncodedBytes: n.encodedBodySize,
          jsEncodedBytes: js.reduce((a, x) => a + x.encodedBodySize, 0),
          jsDecodedBytes: js.reduce((a, x) => a + x.decodedBodySize, 0),
          jsRequests: js.length,
          cssEncodedBytes: css.reduce((a, x) => a + x.encodedBodySize, 0),
          rpcRequests: r.filter((x) => x.name.includes("/rpc/")).length,
          overflow: document.documentElement.scrollWidth > innerWidth,
          fonts: document.fonts.status,
          resources: r
            .filter((x) => new URL(x.name).origin === location.origin)
            .map((x) => ({
              path: new URL(x.name).pathname,
              encoded: x.encodedBodySize,
              decoded: x.decodedBodySize,
              type: x.initiatorType,
            })),
        };
      });
      samples.push({
        family,
        path,
        run,
        status: response.status(),
        gzip: response.headers()["content-encoding"] === "gzip",
        cache: response.headers()["cache-control"],
        hydrationErrors,
        pageErrors,
        ...stats,
      });
      if (run === 1) {
        await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
        const axe = await page.evaluate(async () => {
          const r = await window.axe.run(document, {
            runOnly: {
              type: "tag",
              values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
            },
          });
          return {
            violations: r.violations.map((x) => ({
              id: x.id,
              impact: x.impact,
              description: x.description,
              nodes: x.nodes.map((n) => ({
                target: n.target,
                summary: n.failureSummary,
              })),
            })),
            incomplete: r.incomplete.map((x) => ({
              id: x.id,
              nodes: x.nodes.length,
            })),
          };
        });
        audits.push({ family, ...axe });
        await page.screenshot({
          path: folder + "/" + phase + "-" + family + "-375.png",
          fullPage: false,
        });
      }
      await context.close();
      console.log(
        phase +
          " " +
          family +
          " " +
          run +
          " LCP=" +
          Math.round(stats.lcp) +
          " JS=" +
          stats.jsEncodedBytes +
          " CLS=" +
          stats.cls,
      );
    }
  }
  const median = (values) =>
    [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
  const summary = routes.map(([family]) => {
    const rows = samples.filter((x) => x.family === family);
    if (!rows.length) return { family, skipped: true };
    return {
      family,
      ...Object.fromEntries(
        [
          "lcp",
          "ttfb",
          "cls",
          "longTasks",
          "jsEncodedBytes",
          "jsDecodedBytes",
          "jsRequests",
          "cssEncodedBytes",
          "rpcRequests",
        ].map((key) => [key, median(rows.map((x) => x[key]))]),
      ),
    };
  });
  await writeFile(
    folder +
      "/" +
      phase +
      (process.argv[3] ? "-diagnostic-" + process.argv[3] : "") +
      ".json",
    JSON.stringify(
      {
        phase,
        synthetic: true,
        fieldData: false,
        buildHash: createHash("sha256")
          .update(await readFile("dist/index.html"))
          .update(await readFile("dist-server/entry-server.js"))
          .digest("hex"),
        sourceChanges: execFileSync("git", ["diff", "--name-only"], {
          encoding: "utf8",
        })
          .trim()
          .split("\n")
          .filter(Boolean),
        commit: execFileSync("git", ["rev-parse", "HEAD"], {
          encoding: "utf8",
        }).trim(),
        environment: {
          browser: browser.version(),
          node: process.version,
          platform: platform(),
          os: release(),
          cpu: cpus()[0].model,
          viewport: { width: 375, height: 812 },
          cpuSlowdown: 4,
          latencyMs: 150,
          downloadBitsPerSecond: 1600000,
          uploadBitsPerSecond: 750000,
          coldCache: true,
          consent: "essential",
          samplesPerFamily: 3,
          syntheticMedia:
            "1600x900 SVG fulfilled locally; network timing not representative of image CDN",
        },
        summary,
        samples,
        audits,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await browser?.close();
  await h.close();
}
