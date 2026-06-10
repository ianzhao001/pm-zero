#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { launchDewuBrowser } = require('./lib/playwright-browser.cjs');

const root = path.resolve(__dirname, '../../..');
const target = process.argv[2] ? path.resolve(process.argv[2]) : null;
const screenshotArg = process.argv.find(arg => arg.startsWith('--screenshot='));
const screenshotPath = screenshotArg
  ? path.resolve(screenshotArg.slice('--screenshot='.length))
  : '/private/tmp/dewu-hifi-surface-validation.png';

function usage() {
  console.error('Usage: node skills/dewu/tests/validate-hifi-surface.cjs <html-file> [--screenshot=/tmp/out.png]');
  process.exit(2);
}

function assert(checks, name, pass, detail) {
  checks.push({ name, pass: Boolean(pass), detail });
}

function extractCss(html) {
  return [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(match => match[1]).join('\n');
}

function countColorGroups(buffer) {
  const step = Math.max(1, Math.floor(buffer.length / 14000));
  const buckets = new Set();
  for (let i = 0; i < buffer.length - 3; i += step) {
    buckets.add(`${buffer[i] >> 4}-${buffer[i + 1] >> 4}-${buffer[i + 2] >> 4}`);
    if (buckets.size > 36) break;
  }
  return buckets.size;
}

function cssSelectorCount(css) {
  return (css.match(/\{[^{}]*\}/g) || []).length;
}

function visualAssetCount(html) {
  return (html.match(/<img\b|url\(\s*['"]?(?:data:image|https?:\/\/|\.{0,2}\/|assets\/|images\/)/gi) || []).length;
}

async function main() {
  if (!target) usage();
  const checks = [];
  const exists = fs.existsSync(target);
  assert(checks, 'target exists', exists, target);
  if (!exists) {
    console.log(JSON.stringify({ pass: false, target, checks }, null, 2));
    process.exit(1);
  }

  const html = fs.readFileSync(target, 'utf8');
  const isScreenshotEvidence = /DEWU_SCREENSHOT_EVIDENCE_V4|DEWU_SCREENSHOT_EVIDENCE_V8|data-evidence=["']dewu-screenshot-v[48]/i.test(html);
  const isScreenshotEvidenceV8 = /DEWU_SCREENSHOT_EVIDENCE_V8|data-evidence=["']dewu-screenshot-v8/i.test(html);
  const isModeDemo = /MODE:\s*MODE_DEMO|MODE_DEMO|\bdata-jump=/i.test(html);
  const css = extractCss(html);
  const classes = new Set([...html.matchAll(/class=["']([^"']+)["']/g)].flatMap(match => match[1].split(/\s+/).filter(Boolean)));
  const phoneShellCount = (html.match(/\bphone-shell\b/g) || []).length;
  const dataScreens = (html.match(/\bdata-screen=/g) || []).length;
  const pageStateCount = (html.match(/\bpage-(?:home|buy|explore|me)\b/g) || []).length;

  assert(checks, 'does not reference PRD generation', !/validate_prd\.py|missing-glossary\.docx|missing-funds-owner\.docx/i.test(html), 'HIFI visual lane only');
  assert(checks, 'contains Dewu visual tokens', /#01C2C3|--accent|得物|Dewu|POIZON/.test(html), 'Dewu context signal');
  assert(checks, 'has rich component class vocabulary', classes.size >= 30, classes.size);
  assert(checks, 'has substantial CSS surface styling', cssSelectorCount(css) >= 40, cssSelectorCount(css));
  assert(checks, 'has visual assets or image surfaces', visualAssetCount(html) >= 1, visualAssetCount(html));
  assert(checks, 'not a narrow 320px high-fidelity shell', !/\.phone-shell[\s\S]{0,260}width\s*:\s*320px/i.test(css), 'prefer screenshot-like 390px shell');
  assert(checks, 'does not use forbidden legacy colors', !/#FF2E4D|#FF4657|#D7D7DE|#5A5A66|#2B2F36|oklch\(/i.test(html), 'Dewu DS legal colors');
  assert(checks, 'does not use cheap placeholder language', !/占位|placeholder|lorem ipsum|TODO|假图|示意图/i.test(html), 'no placeholder copy');
  assert(checks, 'does not use filled/generated tab icon classes', !/\blogo-body\b|\btab-icon-fill\b/i.test(html), 'stroke-only tab icons');
  assert(checks, 'does not use hidden preflight evidence', !/dewu-static-preflight-evidence|<template\b[^>]*(?:preflight|evidence)|display\s*:\s*none[^{}]*(?:preflight|evidence)/i.test(html), 'visible rendered DOM only');
  assert(checks, 'does not use tabbar selector aliases', !/\btabbarx\b/i.test(html), 'visible bottom tabs must use .tabbar');

  const hasFourTabShell = /得物/.test(html) && /购买/.test(html) && /探索/.test(html) && /我/.test(html) && /\.tabbar|bottom-tabs/.test(html);
  if (hasFourTabShell) {
    assert(checks, 'four tab labels exist in expected order', /得物[\s\S]*购买[\s\S]*探索[\s\S]*我/.test(html), '得物 / 购买 / 探索 / 我');
    assert(checks, 'bottom active tab is not teal', !/\.tab(?:\.active|\.is-active)[\s\S]{0,220}(#01C2C3|--accent)/i.test(css), 'bottom active should use n140');
  }
  if (/推荐[\s\S]*极光街/.test(html)) {
    const recommendSurface = /data-screen=["']dewu["'][\s\S]*?(?=<\/article>\s*<article[^>]+data-screen=["']buy["'])/i.exec(html)?.[0]
      || /data-state=["']dewu-feed-long["'][\s\S]*?(?=<\/article>\s*<article[^>]+data-state=["']buy-long["'])/i.exec(html)?.[0]
      || html;
    assert(checks, 'recommended top tab keeps 推荐 active', !/<span[^>]*class=["'][^"']*active[^"']*["'][^>]*>\s*(?!推荐)/i.test(html), 'active recommended channel');
    if (!isModeDemo) {
      assert(checks, 'recommended surface does not add invented chip row labels', !/今日热帖|穿搭灵感|AUTH|NEW|先鉴别后发货/i.test(recommendSurface), 'screenshot-backed recommended page');
    }
  }
  assert(checks, 'output is not locked to four screens', dataScreens !== 4 || pageStateCount !== 0 || /golden reference|four-tabs/i.test(target), { dataScreens, pageStateCount });

  const browser = await launchDewuBrowser();
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(`file://${target}`, { waitUntil: 'load' });
  await page.waitForTimeout(250);

  async function collectDemoRoutes() {
    if (!isModeDemo) return null;
    const routes = await page.locator('[data-jump]').evaluateAll(els => [...new Set(els.map(el => el.getAttribute('data-jump')).filter(Boolean))]);
    if (!routes.length) return null;
    const states = {};
    for (const route of routes) {
      await page.locator(`[data-jump="${route}"]`).first().click();
      await page.waitForTimeout(120);
      states[route] = await page.evaluate((currentRoute) => {
        const qa = selector => [...document.querySelectorAll(selector)];
        const q = selector => document.querySelector(selector);
        const rectOf = el => {
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          return { width: rect.width, height: rect.height, top: rect.top, bottom: rect.bottom };
        };
        const styleOf = el => {
          if (!el) return null;
          const cs = getComputedStyle(el);
          return {
            fontSize: cs.fontSize,
            lineHeight: cs.lineHeight,
            webkitLineClamp: cs.webkitLineClamp,
            position: cs.position,
            display: cs.display,
            overflowY: cs.overflowY,
          };
        };
        const phone = q('.phone-screen');
        const scroller = q('.body-container .body .scroll-content, .body-container .body .detail-scroll');
        const before = scroller ? scroller.scrollTop : 0;
        if (scroller) scroller.scrollTop = 240;
        const after = scroller ? scroller.scrollTop : 0;
        const profile = q('.profile-body');
        let profileLower = null;
        if (profile) {
          profile.scrollTop = profile.scrollHeight;
          const pr = profile.getBoundingClientRect();
          const seller = q('.seller-module');
          const service = q('.service-module');
          const visible = el => {
            if (!el) return false;
            const rect = el.getBoundingClientRect();
            return rect.bottom > pr.top && rect.top < pr.bottom;
          };
          profileLower = {
            seller: visible(seller),
            service: visible(service),
            serviceCount: qa('.service-grid .service-item').length,
            orderIconCount: qa('.order-grid .order-item svg').length,
            tileIconCount: qa('.profile-tiles .tile svg').length,
            walletItemCount: qa('.wallet-grid .wallet-item').length,
            walletIconCount: qa('.wallet-grid .wallet-item svg').length,
            couponIconCount: qa('.coupon-grid .coupon-item svg').length,
            serviceIconCount: qa('.service-grid .service-item svg').length,
            profileTop: rectOf(q('.profile-top')),
            profileBody: rectOf(q('.profile-body')),
            moduleTitle: styleOf(q('.module-head h3')),
            profileName: styleOf(q('.profile-name')),
          };
        }
        const classes = new Set(qa('[class]').flatMap(el => [...el.classList].filter(name => /feed|product|utility|profile|order|creator|detail|composer|auth|result|channel|module|card|grid/.test(name))));
        const overflowTargets = ['.phone-screen', '.body', '.scroll-content', '.profile-body', '.detail-scroll', '.feed-grid', '.product-grid', '.service-grid'].map(selector => {
          const el = selector === '.phone-screen' ? phone : q(selector);
          return el ? { selector, diff: el.scrollWidth - el.clientWidth } : { selector, missing: true, diff: 0 };
        });
        return {
          route: currentRoute,
          text: document.body.innerText.replace(/\s+/g, ''),
          phone: rectOf(phone),
          surfaceClassCount: classes.size,
          imageSurfaceCount: qa('[style*="background-image"], img, .media, .feed-media, .product-media, .detail-hero, .cover, .product-art, .feed-img, .hero-photo, .visual, .photo').length,
          tabbarCount: qa('.body-container .body .tabbar').length,
          svgTabIconCount: qa('.body-container .body .tabbar svg').length,
          scroll: scroller ? { before, after, clientHeight: scroller.clientHeight, scrollHeight: scroller.scrollHeight, overflowY: getComputedStyle(scroller).overflowY } : null,
          overflowTargets,
          detail: {
            exists: Boolean(q('.detail-page')),
            hasTabbar: Boolean(q('.detail-page .tabbar,.detail-page .bottom-tabs')),
            hero: rectOf(q('.detail-page .detail-hero')),
            productStrip: rectOf(q('.detail-page .detail-product-strip')),
            actionbar: { rect: rectOf(q('.detail-page .detail-actionbar')), style: styleOf(q('.detail-page .detail-actionbar')) },
          },
          profileLower,
          typography: {
            feedTitle: styleOf(q('.feed-card strong,.feed-body strong')),
            productTitle: styleOf(q('.product-card strong')),
            exploreTitle: styleOf(q('.explore-head h2')),
            utilityTitle: styleOf(q('.utility-row h3')),
            profileName: styleOf(q('.profile-name')),
            moduleTitle: styleOf(q('.module-head h3')),
            detailTitle: styleOf(q('.detail-title')),
          },
        };
      }, route);
    }
    const home = routes.includes('home') ? 'home' : routes[0];
    await page.locator(`[data-jump="${home}"]`).first().click();
    await page.waitForTimeout(80);
    return states;
  }

  const demoRoutes = await collectDemoRoutes();

  const dom = await page.evaluate(() => {
    const qa = selector => [...document.querySelectorAll(selector)];
    const q = selector => document.querySelector(selector);
    const rectOf = el => {
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { width: rect.width, height: rect.height, top: rect.top, bottom: rect.bottom };
    };
    const styleOf = el => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        fontSize: cs.fontSize,
        gap: cs.gap,
        padding: cs.padding,
        height: cs.height,
        marginTop: cs.marginTop,
        webkitLineClamp: cs.webkitLineClamp,
        position: cs.position,
        overflowX: cs.overflowX,
        overflowY: cs.overflowY,
        display: cs.display,
      };
    };
    const phoneRects = qa('.phone-shell').map(rectOf);
    const allText = document.body.innerText;
    const uniqueSurfaceClasses = new Set(qa('[class]').flatMap(el => [...el.classList].filter(name => /feed|product|utility|profile|order|creator|detail|composer|auth|result|channel|module|card|grid/.test(name))));
    const internalSelectors = ['.phone-screen', '.body', '.scroll-content', '.profile-body', '.profile-top', '.profile-main', '.utility-list', '.utility-row', '.channel-grid', '.product-grid', '.feed-grid', '.service-grid', '.detail-body', '.detail-hero', '.detail-actionbar'];
    const internalOverflow = qa('.phone-screen').flatMap((screen, index) => internalSelectors.map(selector => {
      const el = selector === '.phone-screen' ? screen : screen.querySelector(selector);
      if (!el) return { phone: index, selector, exists: false, diff: 0 };
      return {
        phone: index,
        selector,
        exists: true,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        diff: el.scrollWidth - el.clientWidth,
      };
    }));
    const profileTop = q('.profile-top');
    const profileBody = q('.profile-body');
    const stateScrolls = qa('[data-state]').map(root => {
      const state = root.getAttribute('data-state');
      const phone = root.querySelector('.phone-screen');
      const scroller = root.querySelector('.scroll-content');
      if (!scroller) return { state, exists: false };
      const before = scroller.scrollTop;
      scroller.scrollTop = 200;
      const after = scroller.scrollTop;
      return {
        state,
        exists: true,
        clientHeight: scroller.clientHeight,
        scrollHeight: scroller.scrollHeight,
        before,
        after,
        rect: rectOf(scroller),
        phone: rectOf(phone),
        overflowY: getComputedStyle(scroller).overflowY,
      };
    });
    const profileState = document.querySelector('[data-state="me-long"]');
    let profileLowerVisibility = null;
    if (profileState) {
      const phone = profileState.querySelector('.phone-screen');
      const scroller = profileState.querySelector('.scroll-content');
      const seller = profileState.querySelector('.seller-module');
      const service = profileState.querySelector('.service-grid');
      if (scroller) scroller.scrollTop = scroller.scrollHeight;
      const phoneRect = phone?.getBoundingClientRect();
      const visible = el => {
        if (!el || !phoneRect) return false;
        const rect = el.getBoundingClientRect();
        return rect.bottom > phoneRect.top && rect.top < phoneRect.bottom;
      };
      profileLowerVisibility = {
        seller: visible(seller),
        service: visible(service),
        sellerRect: rectOf(seller),
        serviceRect: rectOf(service),
      };
    }
    const relOf = (root, el) => {
      if (!root || !el) return null;
      const phone = root.querySelector('.phone-screen');
      if (!phone) return rectOf(el);
      const rect = el.getBoundingClientRect();
      const base = phone.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        top: rect.top - base.top,
        bottom: rect.bottom - base.top,
      };
    };
    const metricOf = (root, selector) => {
      const el = root?.querySelector(selector);
      return el ? { rect: relOf(root, el), style: styleOf(el), text: el.textContent.trim().replace(/\s+/g, ' ') } : null;
    };
    if (profileState?.querySelector('.scroll-content')) {
      profileState.querySelector('.scroll-content').scrollTop = 0;
    }
    const profileSections = profileState ? [...profileState.querySelectorAll('.profile-scroll-inner > section')] : [];
    const profileDashboard = profileState ? {
      profileTop: metricOf(profileState, '.profile-top'),
      profileBody: metricOf(profileState, '.profile-body'),
      creator: metricOf(profileState, '.creator-card'),
      order: metricOf(profileState, '.order-module'),
      tiles: metricOf(profileState, '.profile-tiles'),
      wallet: metricOf(profileState, '.wallet-module'),
      coupon: metricOf(profileState, '.coupon-module'),
      seller: metricOf(profileState, '.seller-module'),
      services: metricOf(profileState, '.service-module'),
      sectionGapList: profileSections.slice(1).map((el, index) => Math.round(relOf(profileState, el).top - relOf(profileState, profileSections[index]).bottom)),
      orderIconCount: profileState.querySelectorAll('.order-grid .order-item svg').length,
      tileIconCount: profileState.querySelectorAll('.profile-tiles .tile svg').length,
      walletItemCount: profileState.querySelectorAll('.wallet-grid .wallet-item').length,
      walletIconCount: profileState.querySelectorAll('.wallet-grid .wallet-item svg').length,
      couponIconCount: profileState.querySelectorAll('.coupon-grid .coupon-item svg').length,
      serviceIconCount: profileState.querySelectorAll('.service-grid .service-item svg').length,
      scrollInnerStyle: styleOf(profileState.querySelector('.profile-scroll-inner')),
    } : null;
    return {
      allText,
      phoneRects,
      screenRects: qa('.phone-screen').map(rectOf),
      phoneCount: phoneRects.length,
      appTitleCount: qa('.app-title').filter(el => /得物App/.test(el.textContent || '')).length,
      surfaceClassCount: uniqueSurfaceClasses.size,
      tabbarCount: qa('.tabbar,.bottom-tabs').length,
      svgTabIconCount: qa('.tabbar svg,.bottom-tabs svg').length,
      imageSurfaceCount: qa('[style*="background-image"], img, .media, .feed-media, .product-media, .detail-hero, .cover, .product-art, .feed-img, .hero-photo, .visual').length,
      textLength: allText.replace(/\s+/g, '').length,
      bodyHeight: document.body.scrollHeight,
      internalOverflow,
      buy: {
        hasCommerceTabs: Boolean(q('.commerce-tabs')),
        categoryMenuIcon: Boolean(q('.commerce-tabs .commerce-menu svg')),
        categoryMenuText: q('.commerce-tabs .commerce-menu')?.textContent.trim(),
        commerceTabs: styleOf(q('.commerce-tabs')),
        channelGrid: styleOf(q('.channel-grid')),
        trustRow: rectOf(q('.trust-row')),
        productCard: styleOf(q('.product-card')),
        productMedia: rectOf(q('.product-media')),
        productTitle: styleOf(q('.product-card strong')),
        price: styleOf(q('.product-card .price')),
        buyers: styleOf(q('.product-card .buyers')),
      },
      typography: {
        feedTitle: styleOf(q('.feed-body strong')),
        exploreTitle: styleOf(q('.explore-head h2')),
        utilityTitle: styleOf(q('.utility-row h3')),
        utilityText: styleOf(q('.utility-row p')),
        profileName: styleOf(q('.profile-name')),
        profileMeta: styleOf(q('.profile-meta')),
        profileStats: styleOf(q('.profile-stats')),
        creatorItem: styleOf(q('.creator-item')),
        moduleTitle: styleOf(q('.module-head h3')),
        tile: styleOf(q('.tile')),
        orderItem: styleOf(q('.order-item')),
      },
      profile: {
        hasProfile: Boolean(profileTop && profileBody),
        top: { rect: rectOf(profileTop), style: styleOf(profileTop) },
        body: { rect: rectOf(profileBody), style: styleOf(profileBody) },
      },
      v8: {
        stateCount: qa('[data-state]').length,
        scrollContentRects: qa('.scroll-content').map(rectOf),
        detail: {
          exists: Boolean(q('.detail-page')),
          hasTabbar: Boolean(q('.detail-page .tabbar,.detail-page .bottom-tabs')),
          hero: rectOf(q('.detail-page .detail-hero')),
          productStrip: rectOf(q('.detail-page .detail-product-strip')),
          actionbar: { rect: rectOf(q('.detail-page .detail-actionbar')), style: styleOf(q('.detail-page .detail-actionbar')) },
        },
        stateScrolls,
        profileLower: {
          seller: Boolean(q('.seller-module')),
          serviceCount: qa('.service-grid .service-item').length,
          visibility: profileLowerVisibility,
        },
        profileDashboard,
        feed: {
          videoMarkers: qa('.video-marker').length,
          fixedFeedCardHeight: /\.feed-card\b[^{}]*\{[^{}]*[;{]\s*height\s*:/i.test(document.documentElement.innerHTML),
        },
      },
    };
  });
  const png = await page.screenshot({ path: screenshotPath, fullPage: false });
  await browser.close();

  const px = value => Number(String(value || '').replace('px', ''));
  dom.demoRoutes = demoRoutes;
  const demoStateList = demoRoutes ? Object.values(demoRoutes) : [];

  assert(checks, 'browser renders without console errors', errors.length === 0, errors);
  assert(checks, 'phone shell uses screenshot-like width when present', dom.phoneCount === 0 || dom.phoneRects.some(rect => rect.width >= 360), dom.phoneRects);
  if (isScreenshotEvidence) {
    assert(checks, 'screenshot evidence uses 393x852 internal surface', dom.screenRects.every(rect => Math.abs(rect.width - 393) <= 1 && Math.abs(rect.height - 852) <= 1), dom.screenRects);
    assert(checks, 'screenshot evidence keeps app title chrome', dom.appTitleCount >= Math.min(1, dom.phoneCount), dom.appTitleCount);
  }
  const effectiveSurfaceClassCount = isModeDemo && demoStateList.length ? new Set(demoStateList.flatMap(state => Object.keys(state.typography).filter(key => state.typography[key]))).size + Math.max(...demoStateList.map(state => state.surfaceClassCount)) : dom.surfaceClassCount;
  assert(checks, 'has surface-specific modules', effectiveSurfaceClassCount >= 7, effectiveSurfaceClassCount);
  assert(checks, 'has enough real copy density', dom.textLength >= 180, dom.textLength);
  const effectiveImageSurfaceCount = isModeDemo && demoStateList.length ? Math.max(...demoStateList.map(state => state.imageSurfaceCount)) : dom.imageSurfaceCount;
  assert(checks, 'visual surfaces render in DOM', effectiveImageSurfaceCount >= 1, effectiveImageSurfaceCount);
  if (dom.tabbarCount > 0) {
    assert(checks, 'tabbar uses svg icons when present', dom.svgTabIconCount >= Math.min(4, dom.tabbarCount * 4), { tabbarCount: dom.tabbarCount, svgTabIconCount: dom.svgTabIconCount });
  }
  assert(checks, 'phone internals do not horizontally overflow', dom.internalOverflow.every(item => !item.exists || item.diff <= 1), dom.internalOverflow);
  if (dom.buy.hasCommerceTabs) {
    assert(checks, 'buy category uses screenshot menu icon', dom.buy.categoryMenuIcon === true || /三/.test(dom.buy.categoryMenuText || ''), dom.buy);
    if (isScreenshotEvidence) {
      assert(checks, 'buy spacing follows screenshot evidence ranges', px(dom.buy.commerceTabs?.height) >= 50 && px(dom.buy.commerceTabs?.height) <= 56 && px(dom.buy.channelGrid?.height) >= 132 && px(dom.buy.channelGrid?.height) <= 152 && Math.round(dom.buy.trustRow?.height || 0) >= 34 && Math.round(dom.buy.trustRow?.height || 0) <= 40, dom.buy);
      const mediaMin = isScreenshotEvidenceV8 ? 126 : 112;
      const mediaMax = isScreenshotEvidenceV8 ? 150 : 132;
      assert(checks, 'buy product card density follows screenshot evidence', px(dom.buy.productCard?.padding) <= 10 && Math.round(dom.buy.productMedia?.height || 0) >= mediaMin && Math.round(dom.buy.productMedia?.height || 0) <= mediaMax && dom.buy.productTitle?.fontSize === '15px' && dom.buy.productTitle?.webkitLineClamp === '2', dom.buy);
    } else {
      assert(checks, 'buy spacing follows screenshot baseline', dom.buy.commerceTabs?.height === '48px' && dom.buy.commerceTabs?.gap === '18px' && dom.buy.channelGrid?.padding === '14px 10px 12px' && dom.buy.channelGrid?.gap === '14px 8px' && Math.round(dom.buy.trustRow?.height || 0) === 38, dom.buy);
      assert(checks, 'buy product card density follows screenshot baseline', dom.buy.productCard?.padding === '10px' && Math.round(dom.buy.productMedia?.height || 0) === 108 && dom.buy.productTitle?.fontSize === '15px' && dom.buy.productTitle?.webkitLineClamp === '2', dom.buy);
    }
  }
  if (dom.typography.feedTitle) {
    assert(checks, 'feed typography follows screenshot baseline', dom.typography.feedTitle.fontSize === (isScreenshotEvidence ? '15px' : '13px') && dom.typography.feedTitle.webkitLineClamp === '2', dom.typography.feedTitle);
  }
  if (dom.typography.exploreTitle) {
    assert(checks, 'explore typography follows screenshot baseline', dom.typography.exploreTitle.fontSize === (isScreenshotEvidence ? '30px' : '24px') && dom.typography.utilityTitle?.fontSize === (isScreenshotEvidence ? '19px' : '18px') && dom.typography.utilityText?.fontSize === '13px', dom.typography);
  }
  if (dom.profile.hasProfile) {
    const profileHeightOk = isScreenshotEvidence
      ? (isScreenshotEvidenceV8 ? dom.profile.top.rect.height >= 188 && dom.profile.top.rect.height <= 202 : dom.profile.top.rect.height >= 214 && dom.profile.top.rect.height <= 234)
      : dom.profile.top.rect.height >= 230;
    assert(checks, 'profile header is not collapsed', profileHeightOk && dom.profile.body.rect.top >= dom.profile.top.rect.bottom - 1, dom.profile);
    const expectedProfileNameSize = isScreenshotEvidenceV8 ? '18px' : (isScreenshotEvidence ? '20px' : '19px');
    const expectedModuleTitleSize = isScreenshotEvidenceV8 ? '16px' : '18px';
    assert(checks, 'profile typography follows screenshot baseline', dom.typography.profileName?.fontSize === expectedProfileNameSize && px(dom.typography.profileMeta?.fontSize) <= 14 && px(dom.typography.profileStats?.fontSize) <= 14 && dom.typography.creatorItem?.fontSize === '13px' && dom.typography.moduleTitle?.fontSize === expectedModuleTitleSize && dom.typography.tile?.fontSize === '17px' && dom.typography.orderItem?.fontSize === '12px', dom.typography);
  }
  if (isScreenshotEvidence && (!isModeDemo || !demoRoutes)) {
    const normalized = dom.allText.replace(/\s+/g, '');
    const requiredText = isScreenshotEvidenceV8
      ? ['宽松灰T配热裤', 'Apple AirPods Pro 3 入耳', '消息中心', '创作中心', '出售', '免费领券', 'LIANG李昂', '社区公约']
      : ['当田曦薇遇上朦胧破碎感', '100%必中抽奖', '消息中心', '鉴别服务', '创作中心', '退款/售后1'];
    assert(checks, 'screenshot evidence visible text is present', requiredText.every(text => normalized.includes(text.replace(/\s+/g, ''))), normalized.slice(0, 500));
  }
  if (isScreenshotEvidenceV8 && isModeDemo && demoRoutes) {
    const normalizedDemo = Object.values(demoRoutes).map(state => state.text).join('');
    const longRoutes = ['home', 'buy', 'profile', 'detail'].map(route => demoRoutes[route]).filter(Boolean);
    assert(checks, 'v1.0.11 demo routes use rendered screenshot surfaces', ['home', 'buy', 'explore', 'profile', 'detail'].every(route => demoRoutes[route]) && demoStateList.every(state => Math.abs(state.phone.width - 393) <= 1 && Math.abs(state.phone.height - 852) <= 1), demoRoutes);
    assert(checks, 'v1.0.11 demo long routes are actually scrollable', longRoutes.length === 4 && longRoutes.every(state => state.scroll && state.scroll.scrollHeight > state.scroll.clientHeight + 120 && state.scroll.after > state.scroll.before), longRoutes.map(state => state.scroll));
    assert(checks, 'v1.0.11 demo internals have no horizontal overflow', demoStateList.every(state => state.overflowTargets.every(item => item.missing || item.diff <= 1)), demoStateList.map(state => state.overflowTargets.filter(item => item.diff > 1)));
    assert(checks, 'v1.0.11 demo detail page is Type 2 with hero and actionbar', demoRoutes.detail?.detail.exists && !demoRoutes.detail?.detail.hasTabbar && demoRoutes.detail?.detail.hero?.height >= 300 && demoRoutes.detail?.detail.productStrip?.height >= 70 && demoRoutes.detail?.detail.actionbar?.style?.position === 'absolute', demoRoutes.detail?.detail);
    assert(checks, 'v1.0.11 demo profile lower dashboard is reachable', demoRoutes.profile?.profileLower?.seller && demoRoutes.profile?.profileLower?.service && demoRoutes.profile?.profileLower?.serviceCount === 8, demoRoutes.profile?.profileLower);
    assert(checks, 'v1.0.11 demo profile icons and wallet grammar match evidence', demoRoutes.profile?.profileLower?.orderIconCount === 5 && demoRoutes.profile?.profileLower?.tileIconCount === 4 && demoRoutes.profile?.profileLower?.walletItemCount === 4 && demoRoutes.profile?.profileLower?.walletIconCount === 0 && demoRoutes.profile?.profileLower?.couponIconCount === 4 && demoRoutes.profile?.profileLower?.serviceIconCount === 8, demoRoutes.profile?.profileLower);
    assert(checks, 'v1.0.11 demo typography matches screenshot footprint', demoRoutes.home?.typography.feedTitle?.fontSize === '15px' && demoRoutes.home?.typography.feedTitle?.webkitLineClamp === '2' && demoRoutes.buy?.typography.productTitle?.fontSize === '15px' && demoRoutes.buy?.typography.productTitle?.webkitLineClamp === '2' && demoRoutes.profile?.typography.profileName?.fontSize === '18px' && demoRoutes.profile?.typography.moduleTitle?.fontSize === '16px' && demoRoutes.detail?.typography.detailTitle?.fontSize === '18px', Object.fromEntries(Object.entries(demoRoutes).map(([route, state]) => [route, state.typography])));
    assert(checks, 'v1.0.11 demo visible text comes from screenshot grammar', ['摩哈云游戏机二代', '香奈儿1957发财水', '消息中心', '道u_5dbd337a7a', 'LIANG李昂', '社区公约'].every(text => normalizedDemo.includes(text.replace(/\s+/g, ''))), normalizedDemo.slice(0, 700));
  } else if (isScreenshotEvidenceV8) {
    const normalized = dom.allText.replace(/\s+/g, '');
    const longStates = new Set(['dewu-feed-long', 'buy-long', 'me-long', 'feed-detail']);
    const scrollable = dom.v8.stateScrolls.filter(item => longStates.has(item.state));
    assert(checks, 'v1.0.9 long screenshot states are actually scrollable', scrollable.length === 4 && scrollable.every(item => item.exists && item.scrollHeight > item.clientHeight + 120 && item.after > item.before), scrollable);
    assert(checks, 'v1.0.9 evidence uses long screenshot scroll states', dom.v8.stateCount >= 5 && dom.v8.scrollContentRects.some(rect => rect && rect.height >= 500 && rect.height <= 720), dom.v8);
    assert(checks, 'v1.0.9 detail page is Type 2 with hero and sticky actionbar', dom.v8.detail.exists && !dom.v8.detail.hasTabbar && dom.v8.detail.hero?.height >= 600 && dom.v8.detail.productStrip?.height >= 72 && dom.v8.detail.actionbar?.style?.position === 'absolute', dom.v8.detail);
    assert(checks, 'v1.0.9 profile lower dashboard is reachable by scrolling', dom.v8.profileLower.seller && dom.v8.profileLower.serviceCount === 8 && dom.v8.profileLower.visibility?.seller && dom.v8.profileLower.visibility?.service, dom.v8.profileLower);
    assert(checks, 'v1.0.10 profile header and body rhythm matches screenshot', dom.v8.profileDashboard?.profileTop?.rect?.height >= 188 && dom.v8.profileDashboard?.profileTop?.rect?.height <= 202 && dom.v8.profileDashboard?.profileBody?.rect?.height >= 580 && dom.v8.profileDashboard?.profileBody?.rect?.height <= 594 && Math.abs((dom.v8.profileDashboard?.profileBody?.rect?.top || 0) - (dom.v8.profileDashboard?.profileTop?.rect?.bottom || 0)) <= 1, dom.v8.profileDashboard);
    assert(checks, 'v1.0.10 profile dashboard stack is compact and not grid-stretched', dom.v8.profileDashboard?.scrollInnerStyle?.display !== 'grid' && dom.v8.profileDashboard?.creator?.rect?.height >= 66 && dom.v8.profileDashboard?.creator?.rect?.height <= 76 && dom.v8.profileDashboard?.order?.rect?.height >= 104 && dom.v8.profileDashboard?.order?.rect?.height <= 116 && dom.v8.profileDashboard?.wallet?.rect?.height >= 90 && dom.v8.profileDashboard?.wallet?.rect?.height <= 104 && dom.v8.profileDashboard?.coupon?.rect?.height >= 84 && dom.v8.profileDashboard?.coupon?.rect?.height <= 96 && dom.v8.profileDashboard?.seller?.rect?.height >= 96 && dom.v8.profileDashboard?.seller?.rect?.height <= 112 && dom.v8.profileDashboard?.services?.rect?.height >= 112 && dom.v8.profileDashboard?.services?.rect?.height <= 132 && dom.v8.profileDashboard?.sectionGapList?.every(gap => gap >= 7 && gap <= 12), dom.v8.profileDashboard);
    assert(checks, 'v1.0.10 profile dashboard line icons are complete', dom.v8.profileDashboard?.orderIconCount === 5 && dom.v8.profileDashboard?.tileIconCount === 4 && dom.v8.profileDashboard?.walletItemCount === 4 && dom.v8.profileDashboard?.walletIconCount === 0 && dom.v8.profileDashboard?.couponIconCount === 4 && dom.v8.profileDashboard?.serviceIconCount === 8, dom.v8.profileDashboard);
    assert(checks, 'v1.0.9 long feed includes adaptive cards and video marker', dom.v8.feed.videoMarkers >= 1 && !dom.v8.feed.fixedFeedCardHeight, dom.v8.feed);
    assert(checks, 'v1.0.9 visible text is present', ['宽松灰T配热裤', 'Apple AirPods Pro 3 入耳', '出售', '免费领券', 'LIANG李昂', '社区公约'].every(text => normalized.includes(text.replace(/\s+/g, ''))), normalized.slice(0, 700));
  }
  assert(checks, 'screenshot written', fs.existsSync(screenshotPath) && fs.statSync(screenshotPath).size > 50000, { path: screenshotPath, bytes: fs.existsSync(screenshotPath) ? fs.statSync(screenshotPath).size : 0 });
  assert(checks, 'screenshot nonblank color variance', countColorGroups(png) > 28, countColorGroups(png));

  const failed = checks.filter(check => !check.pass);
  const report = {
    pass: failed.length === 0,
    target: path.relative(root, target),
    screenshot: screenshotPath,
    total: checks.length,
    failed: failed.length,
    checks,
  };
  console.log(JSON.stringify(report, null, 2));
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
