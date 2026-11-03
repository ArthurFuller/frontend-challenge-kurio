import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const base = process.env.AUDIT_URL || "http://localhost:4173";
const output = new URL("../reports/", import.meta.url).pathname.replace(
  /^\/([A-Z]:)/,
  "$1",
);
await mkdir(output, { recursive: true });
const rows = [];
for (const path of ["/", "/nft/emerald-ape-042"]) {
  for (const profile of ["mobile", "desktop"]) {
    for (let run = 1; run <= 3; run++) {
      const chrome = await launch({
        chromePath: chromium.executablePath(),
        chromeFlags: ["--headless=new", "--disable-gpu", "--no-sandbox"],
      });
      try {
        const config = {
          extends: "lighthouse:default",
          settings: {
            onlyCategories: [
              "performance",
              "accessibility",
              "best-practices",
              "seo",
            ],
            formFactor: profile,
            screenEmulation:
              profile === "desktop"
                ? {
                    mobile: false,
                    width: 1440,
                    height: 900,
                    deviceScaleFactor: 1,
                    disabled: false,
                  }
                : {
                    mobile: true,
                    width: 390,
                    height: 844,
                    deviceScaleFactor: 1,
                    disabled: false,
                  },
          },
        };
        const result = await lighthouse(
          `${base}${path}`,
          { port: chrome.port, output: ["html", "json"], logLevel: "error" },
          config,
        );
        if (!result) throw new Error("Lighthouse não retornou resultado");
        const name = `${path === "/" ? "inicio" : "detalhe"}-${profile}-${run}`;
        await writeFile(join(output, `${name}.html`), result.report[0]);
        await writeFile(join(output, `${name}.json`), result.report[1]);
        const lhr = result.lhr;
        rows.push({
          page: path,
          profile,
          run,
          performance: Math.round(
            (lhr.categories.performance.score || 0) * 100,
          ),
          accessibility: Math.round(
            (lhr.categories.accessibility.score || 0) * 100,
          ),
          bestPractices: Math.round(
            (lhr.categories["best-practices"].score || 0) * 100,
          ),
          seo: Math.round((lhr.categories.seo.score || 0) * 100),
          lcp: lhr.audits["largest-contentful-paint"].numericValue,
          cls: lhr.audits["cumulative-layout-shift"].numericValue,
          tbt: lhr.audits["total-blocking-time"].numericValue,
        });
        process.stdout.write(
          `${name}: ${rows.at(-1).performance}/${rows.at(-1).accessibility}/${rows.at(-1).bestPractices}/${rows.at(-1).seo}\n`,
        );
      } finally {
        await chrome.kill();
      }
    }
  }
}
const median = (values) => [...values].sort((a, b) => a - b)[1];
const summary = [];
for (const page of ["/", "/nft/emerald-ape-042"])
  for (const profile of ["mobile", "desktop"]) {
    const group = rows.filter(
      (row) => row.page === page && row.profile === profile,
    );
    summary.push({
      page,
      profile,
      ...Object.fromEntries(
        [
          "performance",
          "accessibility",
          "bestPractices",
          "seo",
          "lcp",
          "cls",
          "tbt",
        ].map((key) => [key, median(group.map((row) => row[key]))]),
      ),
    });
  }
await writeFile(
  join(output, "summary.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      node: process.version,
      rows,
      summary,
    },
    null,
    2,
  ),
);
process.exit(0);
