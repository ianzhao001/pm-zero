import { checkInlineScripts, lineOf, matches, push } from '../../../../system/shared/context-package-core/preflight-core/engine.mjs';

const MODE_DECLARATION_RE = /<!--\s*MODE:\s*(MODE_FLOW|MODE_DEMO|MODE_PRODUCT_ADVICE)\s*-->|\/\/\s*MODE:\s*(MODE_FLOW|MODE_DEMO|MODE_PRODUCT_ADVICE)/g;

function declaredModeFor(value) {
  if (value === 'MODE_FLOW') return 'flow';
  if (value === 'MODE_DEMO') return 'demo';
  if (value === 'MODE_PRODUCT_ADVICE') return 'product_advice';
  return 'unknown';
}

export function checkC00ModeDeclaration(ctx) {
  const declarations = matches(ctx.html, MODE_DECLARATION_RE).map(match => match[1] || match[2]);
  if (declarations.length !== 1) {
    push(ctx.errors, 'C00', 'HTML artifacts require exactly one MODE declaration; found ' + declarations.length, 1);
    return;
  }

  const declared = declarations[0];
  const declaredMode = declaredModeFor(declared);
  if ((declaredMode === 'flow' || declaredMode === 'demo') && ctx.mode !== declaredMode) {
    push(ctx.errors, 'C00', 'declared ' + declared + ' conflicts with resolved mode: ' + ctx.mode, 1);
  }

  if (declaredMode === 'product_advice' && /window\.SCREENS|\.canvas\b|\.chrome-layer|\.body-container|class\s*=\s*["'][^"']*\bhud\b/i.test(ctx.html)) {
    push(ctx.errors, 'C00', 'MODE_PRODUCT_ADVICE cannot include flow canvas or demo shell structure', 1);
  }
}

export function checkC01TemporaryColors(ctx) {
  const re = /oklch\(|#000000\b|#111111\b/gi;
  for (const m of matches(ctx.html, re)) {
    push(ctx.errors, 'C01', 'temporary or overly heavy color: ' + m[0], lineOf(ctx.html, m.index));
  }
}

export function checkC02HandFonts(ctx) {
  const re = /Caveat|Kalam|Shadows\s+Into\s+Light|Ma\s+Shan\s+Zheng|font-family[^;{}]*hand/gi;
  for (const m of matches(ctx.html, re)) {
    push(ctx.errors, 'C02', 'handwritten UI font is not allowed: ' + m[0], lineOf(ctx.html, m.index));
  }
}

export function checkC03PlaceholderCopy(ctx) {
  const re = /Lorem ipsum|John Doe|Jane Doe|张三|李四|王五/gi;
  for (const m of matches(ctx.html, re)) {
    push(ctx.errors, 'C03', 'placeholder copy must be replaced: ' + m[0], lineOf(ctx.html, m.index));
  }
}

export function checkC04ButtonNowrap(ctx) {
  const css = matches(ctx.html, /\.btn\b[^{}]*\{[^{}]*white-space\s*:\s*nowrap[^{}]*\}/gis);
  if (css.length === 0) push(ctx.errors, 'C04', 'global .btn selector must include white-space: nowrap', 1);
}

export function checkC05JavaScript(ctx) {
  checkInlineScripts(ctx);
  for (const issue of ctx.errors) {
    if (issue.rule === 'JS01') issue.rule = 'C05';
  }
}

export function checkC06FileSize(ctx) {
  const lines = ctx.html.split(/\r?\n/).length;
  if (lines > 1200) push(ctx.errors, 'C06', 'HTML exceeds 1200 lines: ' + lines, Math.min(lines, 1201));
  else if (lines > 900) push(ctx.warnings, 'C06', 'HTML exceeds 900 lines: ' + lines, Math.min(lines, 901));
}

export function checkC07TabGridScope(ctx) {
  const re = /\.tabbar\b[^{}]*\{[^{}]*grid-template-columns\s*:\s*repeat\(\s*([0-9]+)\s*,/gi;
  for (const m of matches(ctx.html, re)) {
    const count = Number(m[1]);
    if (count < 2 || count > 5) {
      push(ctx.errors, 'C07', 'tabbar column count should be between 2 and 5: ' + count, lineOf(ctx.html, m.index));
    }
  }
}

export function checkC08MobileShell(ctx) {
  if (ctx.mode !== 'flow' && ctx.mode !== 'demo') return;

  if (!/class\s*=\s*["'][^"']*\bphone-shell\b[^"']*["']/i.test(ctx.html) || !/class\s*=\s*["'][^"']*\bphone-screen\b[^"']*["']/i.test(ctx.html)) {
    push(ctx.errors, 'C08', 'mobile artifacts require .phone-shell > .phone-screen', 1);
    return;
  }

  if (!/class\s*=\s*["'][^"']*\bphone-shell\b[^"']*["'][\s\S]{0,700}?class\s*=\s*["'][^"']*\bphone-screen\b/i.test(ctx.html)) {
    push(ctx.errors, 'C08', '.phone-screen must be nested inside .phone-shell', 1);
  }

  if (!/\.phone-shell::?before\b|class\s*=\s*["'][^"']*\b(?:device-island|dynamic-island)\b/i.test(ctx.html)) {
    push(ctx.errors, 'C08', 'phone shell must include a Dynamic Island marker', 1);
  }

  const shellRules = matches(ctx.html, /\.phone-shell\b[^{}]*\{[^{}]*\}/gis);
  const hasReferenceSize = shellRules.some(rule => /width\s*:\s*320px/i.test(rule[0])
    && /height\s*:\s*694px/i.test(rule[0])
    && /border-radius\s*:\s*44px/i.test(rule[0])
    && /padding\s*:\s*7px/i.test(rule[0]));
  if (!hasReferenceSize) {
    push(ctx.warnings, 'C08', 'phone shell should use the compact 320x694 / 44px / 7px reference frame', 1);
  }
}

export function checkC09TypeDensity(ctx) {
  if (ctx.mode !== 'flow' && ctx.mode !== 'demo') return;

  const largeHero = /\.hero\s+h2\b[^{}]*\{[^{}]*font-size\s*:\s*([0-9.]+)px/gi;
  for (const m of matches(ctx.html, largeHero)) {
    if (Number(m[1]) > 24) push(ctx.warnings, 'C09', 'mobile hero title should stay within 20-24px: ' + m[1] + 'px', lineOf(ctx.html, m.index));
  }

  const largeCardTitle = /\.card\s+strong\b[^{}]*\{[^{}]*font-size\s*:\s*([0-9.]+)px/gi;
  for (const m of matches(ctx.html, largeCardTitle)) {
    if (Number(m[1]) > 13) push(ctx.warnings, 'C09', 'mobile card title should usually stay near 12-13px: ' + m[1] + 'px', lineOf(ctx.html, m.index));
  }

  const largeBody = /(?:^|[,{]\s*)p\b[^{}]*\{[^{}]*font-size\s*:\s*([0-9.]+)px/gim;
  for (const m of matches(ctx.html, largeBody)) {
    if (Number(m[1]) > 12) push(ctx.warnings, 'C09', 'mobile body copy should usually stay near 11-12px: ' + m[1] + 'px', lineOf(ctx.html, m.index));
  }
}

export function checkC10ScrollablePhoneBody(ctx) {
  if (ctx.mode !== 'flow' && ctx.mode !== 'demo') return;
  const scrollable = /\.(?:content|body|screen-body|scroll-body)\b[^{}]*\{[^{}]*overflow(?:-y)?\s*:\s*auto[^{}]*\}/gis;
  if (matches(ctx.html, scrollable).length === 0) {
    push(ctx.errors, 'C10', 'phone content must expose a vertical scroll surface with overflow-y:auto', 1);
  }
}

function visibleCopyForLanguage(html) {
  const scriptStrings = [];
  const withoutStyles = html.replace(/<style\b[\s\S]*?<\/style>/gi, '');
  const withoutScripts = withoutStyles.replace(/<script\b[\s\S]*?<\/script>/gi, script => {
    const body = script.replace(/^<script\b[^>]*>/i, '').replace(/<\/script>$/i, '');
    for (const m of matches(body, /(["'`])((?:\\.|(?!\1)[\s\S])*?)\1/g)) {
      const visible = m[2]
        .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\b(?:class|id|data-[a-z-]+|viewBox|d)\s*=\s*[^>\s]+/gi, ' ');
      scriptStrings.push(visible);
    }
    return ' ';
  });
  const text = withoutScripts
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ');
  return (text + ' ' + scriptStrings.join(' ')).replace(/\s+/g, ' ');
}

export function checkC11ChinesePrimaryLanguage(ctx) {
  if (ctx.mode !== 'flow' && ctx.mode !== 'demo') return;
  const copy = visibleCopyForLanguage(ctx.html);
  const cjkCount = (copy.match(/[\u3400-\u9fff]/g) || []).length;
  const latinCount = (copy.match(/[A-Za-z]/g) || []).length;
  if (cjkCount < 24 || cjkCount < latinCount * 0.18) {
    push(ctx.errors, 'C11', 'design-forge default output must keep Chinese as the primary page language', 1);
  }
}

export function checkC12NoInternalHorizontalScroll(ctx) {
  if (ctx.mode !== 'flow' && ctx.mode !== 'demo') return;

  const internalRuleRe = /\.(?:phone-screen|content|body|screen-body|scroll-body|body-container)\b[^{}]*\{[^{}]*\}/gis;
  for (const m of matches(ctx.html, internalRuleRe)) {
    const rule = m[0];
    if (/overflow-x\s*:\s*(?:auto|scroll)/i.test(rule)) {
      push(ctx.errors, 'C12', 'mobile phone internals must not expose horizontal scrolling; only canvas/rail may scroll horizontally', lineOf(ctx.html, m.index));
      return;
    }
    if (/overflow-y\s*:\s*auto/i.test(rule) && !/overflow-x\s*:\s*hidden/i.test(rule)) {
      push(ctx.errors, 'C12', 'vertical phone scroll surfaces must also declare overflow-x:hidden to prevent mobile horizontal bars', lineOf(ctx.html, m.index));
      return;
    }
  }
}

export function checkC13FeedEndNoArtificialBlank(ctx) {
  if (ctx.mode !== 'flow' && ctx.mode !== 'demo') return;

  const hasFeedSurface = /\b(?:feed|product|masonry)-(?:grid|list|stream)\b|\b(?:feed|product)-grid\b/i.test(ctx.html);
  if (!hasFeedSurface) return;

  const riskyMinHeight = /(?:\.scroll-inner\b|\.feed-scroll\s+\.scroll-inner\b|\.product-scroll\s+\.scroll-inner\b|\.commerce-scroll\s+\.scroll-inner\b)[^{}]*\{[^{}]*min-height\s*:\s*(?:9[0-9]{2}|[1-9][0-9]{3,})px/gi;
  for (const m of matches(ctx.html, riskyMinHeight)) {
    push(ctx.errors, 'C13', 'Feed-like scroll surfaces must end at content height; do not create bottom blank space with artificial scroll-inner min-height', lineOf(ctx.html, m.index));
    return;
  }

  const spacer = /\b(?:feed|product|masonry|scroll)-(?:spacer|blank|padding-bottom)\b|\bbottom-blank\b/gi;
  for (const m of matches(ctx.html, spacer)) {
    push(ctx.errors, 'C13', 'Feed-like surfaces must stop when data ends; remove spacer/blank elements that create large empty bottoms', lineOf(ctx.html, m.index));
    return;
  }
}

export default [
  checkC00ModeDeclaration,
  checkC01TemporaryColors,
  checkC02HandFonts,
  checkC03PlaceholderCopy,
  checkC04ButtonNowrap,
  checkC05JavaScript,
  checkC06FileSize,
  checkC07TabGridScope,
  checkC08MobileShell,
  checkC09TypeDensity,
  checkC10ScrollablePhoneBody,
  checkC11ChinesePrimaryLanguage,
  checkC12NoInternalHorizontalScroll,
  checkC13FeedEndNoArtificialBlank,
];
