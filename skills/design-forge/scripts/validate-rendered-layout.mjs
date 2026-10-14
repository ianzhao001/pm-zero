#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const {
  createPlaywrightBrowserLauncher,
} = require('../../../system/shared/browser/playwright-browser.cjs');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const target = process.argv[2] ? path.resolve(process.argv[2]) : null;
const screenshotArg = process.argv.find(arg => arg.startsWith('--screenshot='));
const screenshotPath = screenshotArg
  ? path.resolve(screenshotArg.slice('--screenshot='.length))
  : '/private/tmp/design-forge-rendered-layout.png';
const { launchBrowser: launchDesignForgeBrowser } = createPlaywrightBrowserLauncher({
  label: 'Design Forge Playwright',
  envVar: 'DESIGN_FORGE_PLAYWRIGHT_BROWSER',
  chromeFallbackLockPath: '/private/tmp/design-forge-playwright-chrome.lock',
  setupCommand: 'node system/shared/browser/setup-playwright-browser.cjs --install',
  requireLabel: 'design-forge-playwright-require.js',
});

function usage() {
  console.error('Usage: node skills/design-forge/scripts/validate-rendered-layout.mjs <html-file> [--screenshot=/tmp/out.png]');
  process.exit(2);
}

function assert(checks, name, pass, detail) {
  checks.push({ name, pass: Boolean(pass), detail });
}

async function main() {
  if (!target) usage();
  const checks = [];
  const exists = fs.existsSync(target);
  assert(checks, 'target exists', exists, target);
  if (!exists) {
    console.log(JSON.stringify({ pass: false, target, screenshot: screenshotPath, checks }, null, 2));
    process.exit(1);
  }

  const browser = await launchDesignForgeBrowser();

  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto(pathToFileURL(target).href, { waitUntil: 'load' });
  await page.waitForTimeout(150);

  const dom = await page.evaluate(() => {
    const qa = (root, selector) => [...root.querySelectorAll(selector)];
    const rectOf = el => {
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        left: Math.round(rect.left * 100) / 100,
        top: Math.round(rect.top * 100) / 100,
        right: Math.round(rect.right * 100) / 100,
        bottom: Math.round(rect.bottom * 100) / 100,
        width: Math.round(rect.width * 100) / 100,
        height: Math.round(rect.height * 100) / 100,
      };
    };
    const visible = el => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0;
    };
    const overlap = (a, b) => {
      const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      return x * y;
    };
    const area = rect => Math.max(0, rect.width) * Math.max(0, rect.height);
    const selectorOf = el => {
      const cls = [...el.classList].slice(0, 3).join('.');
      return `${el.tagName.toLowerCase()}${cls ? `.${cls}` : ''}`;
    };
    const phones = qa(document, '.phone-screen');
    const roots = phones.length ? phones : [document.body];

    const blankScreens = roots.map((root, index) => ({
      index,
      selector: root === document.body ? 'body' : '.phone-screen',
      textLength: (root.innerText || '').replace(/\s+/g, '').length,
      visibleElementCount: qa(root, '*').filter(visible).length,
      rect: rectOf(root),
    }));

    const overflow = roots.flatMap((root, index) => {
      const targets = [root, ...qa(root, '.content,.body,.screen-body,.scroll-body,.card,.feed-card,.product-card,.utility-row,.toolbar,.tabbar,.bottom-tabs,.sheet,.toast,.btn')];
      return targets.filter(visible).map(el => ({
        phone: index,
        selector: selectorOf(el),
        diff: Math.round((el.scrollWidth - el.clientWidth) * 100) / 100,
        rect: rectOf(el),
      }));
    });

    const buttonOverflow = roots.flatMap((root, index) => qa(root, 'button,.btn').filter(visible).map(el => ({
      phone: index,
      selector: selectorOf(el),
      text: (el.textContent || '').trim().replace(/\s+/g, ' '),
      diff: Math.round((el.scrollWidth - el.clientWidth) * 100) / 100,
      rect: rectOf(el),
    }))).filter(item => item.text && item.diff > 1);

    const iconIssues = roots.flatMap((root, index) => qa(root, '.tabbar svg,.bottom-tabs svg,.toolbar svg,.icon-btn svg,.utility-row svg,.tool-item svg,.nav-action svg').filter(visible).map(svg => {
      const rect = rectOf(svg);
      const hasViewBox = svg.hasAttribute('viewBox');
      const hasShape = svg.querySelector('path,circle,rect,line,polyline,polygon,ellipse,use');
      return {
        phone: index,
        selector: selectorOf(svg),
        hasViewBox,
        hasShape: Boolean(hasShape),
        rect,
        pass: hasViewBox && Boolean(hasShape) && rect.width >= 10 && rect.height >= 10 && rect.width <= 48 && rect.height <= 48,
      };
    })).filter(item => !item.pass);

    const layoutOverlaps = [];
    for (const [phoneIndex, root] of roots.entries()) {
      const elements = qa(root, '.card,.feed-card,.product-card,.utility-row,.tool-item,.sheet,.toast,.cta,.bottom-cta').filter(visible);
      for (let i = 0; i < elements.length; i += 1) {
        for (let j = i + 1; j < elements.length; j += 1) {
          const a = elements[i];
          const b = elements[j];
          if (a.contains(b) || b.contains(a)) continue;
          const ar = rectOf(a);
          const br = rectOf(b);
          const shared = overlap(ar, br);
          const minArea = Math.min(area(ar), area(br));
          if (minArea > 0 && shared / minArea > 0.18 && shared > 24) {
            layoutOverlaps.push({
              phone: phoneIndex,
              a: selectorOf(a),
              b: selectorOf(b),
              overlap: Math.round(shared),
              aRect: ar,
              bRect: br,
            });
          }
        }
      }
    }

    const bottomCover = [];
    for (const [phoneIndex, root] of roots.entries()) {
      const chrome = qa(root, '.tabbar,.bottom-tabs,.bottom-nav').filter(visible);
      const actions = qa(root, '.cta,.bottom-cta,[data-primary-action],.btn.primary,button.btn').filter(visible);
      for (const c of chrome) {
        for (const action of actions) {
          if (c.contains(action) || action.contains(c)) continue;
          const cr = rectOf(c);
          const ar = rectOf(action);
          const shared = overlap(cr, ar);
          if (shared > Math.min(area(ar), area(cr)) * 0.12 && shared > 20) {
            bottomCover.push({
              phone: phoneIndex,
              chrome: selectorOf(c),
              action: selectorOf(action),
              overlap: Math.round(shared),
              chromeRect: cr,
              actionRect: ar,
            });
          }
        }
      }
    }

    return {
      phoneCount: phones.length,
      blankScreens,
      overflow,
      buttonOverflow,
      iconIssues,
      layoutOverlaps,
      bottomCover,
    };
  });

  const screenshotBuffer = await page.screenshot({ path: screenshotPath, fullPage: false });
  await browser.close();

  assert(checks, 'browser renders without console errors', errors.length === 0, errors);
  assert(checks, 'screen is not blank', dom.blankScreens.every(item => item.textLength >= 16 && item.visibleElementCount >= 2), dom.blankScreens);
  assert(checks, 'phone internals do not horizontally overflow', dom.overflow.every(item => item.diff <= 1), dom.overflow.filter(item => item.diff > 1));
  assert(checks, 'interactive icons render visibly', dom.iconIssues.length === 0, dom.iconIssues);
  assert(checks, 'layout overlap', dom.layoutOverlaps.length === 0, dom.layoutOverlaps);
  assert(checks, 'fixed bottom chrome does not cover actions', dom.bottomCover.length === 0, dom.bottomCover);
  assert(checks, 'button text does not overflow', dom.buttonOverflow.length === 0, dom.buttonOverflow);
  assert(checks, 'screenshot written', fs.existsSync(screenshotPath) && screenshotBuffer.length > 1000, { path: screenshotPath, bytes: screenshotBuffer.length });

  const failed = checks.filter(check => !check.pass);
  console.log(JSON.stringify({
    pass: failed.length === 0,
    target: path.relative(root, target),
    screenshot: screenshotPath,
    total: checks.length,
    failed: failed.length,
    checks,
  }, null, 2));
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
