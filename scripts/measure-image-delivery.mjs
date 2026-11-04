import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const base = process.argv[2] || 'https://dotfumes.netlify.app';
const label = process.argv[3] || 'measurement';
const out = process.argv[4] || `/tmp/dotfumes-image-qa-${label}`;
const widths = [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920];
const routes = ['/', '/collection', '/product/bold-decision', '/about'];
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
try {
  for (const route of routes) {
    for (const width of widths) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: width < 768 ? 2 : 1 });
      const page = await context.newPage();
      const images = [];
      const broken = [];
      page.on('response', async (response) => {
        const type = response.headers()['content-type'] || '';
        if (!type.startsWith('image/')) return;
        const pathname = new URL(response.url()).pathname;
        const bytes = Number(response.headers()['content-length']) || (await response.body().then((body) => body.length).catch(() => 0));
        images.push({ path: pathname, bytes, status: response.status() });
        if (!response.ok()) broken.push({ path: pathname, status: response.status() });
      });
      await page.addInitScript(() => {
        window.__imageMetrics = { lcp: null, cls: 0 };
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) window.__imageMetrics.lcp = { ms: entry.startTime, tag: entry.element?.tagName || null, url: entry.url || null };
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__imageMetrics.cls += entry.value;
        }).observe({ type: 'layout-shift', buffered: true });
      });
      const response = await page.goto(new URL(route, base).href, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1800);
      const rendered = await page.evaluate(() => ({
        metrics: window.__imageMetrics,
        images: [...document.images].filter((image) => image.getBoundingClientRect().width > 0).map((image) => ({
          src: image.currentSrc || image.src, width: Math.round(image.getBoundingClientRect().width), height: Math.round(image.getBoundingClientRect().height),
          naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, complete: image.complete,
        })),
      }));
      const file = `${route === '/' ? 'home' : route.replaceAll('/', '-').replace(/^-/, '')}-${width}.png`;
      await page.screenshot({ path: path.join(out, file), fullPage: false });
      const record = { route, width, http: response?.status(), imageBytes: images.reduce((sum, item) => sum + item.bytes, 0), requests: images.length, duplicateRequests: images.length - new Set(images.map((item) => item.path)).size, broken, ...rendered };
      results.push(record);
      console.log(`${route} ${width}: ${record.imageBytes} image bytes, LCP ${record.metrics?.lcp?.ms ?? 'n/a'}, CLS ${record.metrics?.cls ?? 'n/a'}`);
      await context.close();
    }
  }
} finally { await browser.close(); }
await fs.writeFile(path.join(out, 'results.json'), JSON.stringify(results, null, 2));
