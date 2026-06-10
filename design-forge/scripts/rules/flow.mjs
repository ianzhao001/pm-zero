import { hasClass, matches, push, lineOf } from '../../../../system/shared/context-package-core/preflight-core/engine.mjs';

export function checkF01Canvas(ctx) {
  if (!hasClass(ctx.html, 'canvas') && !/id\s*=\s*["']canvas["']/i.test(ctx.html)) {
    push(ctx.errors, 'F01', 'MODE_FLOW requires a canvas container', 1);
  }
}

export function checkF02Declarations(ctx) {
  if (!/window\.SCREENS/.test(ctx.html) || !/window\.ARROWS/.test(ctx.html)) {
    push(ctx.errors, 'F02', 'MODE_FLOW requires window.SCREENS and window.ARROWS', 1);
  }
}

export function checkF03NoDemoShell(ctx) {
  const re = /--ease-ios|\.chrome-layer|class\s*=\s*["'][^"']*\bhud\b/gi;
  for (const m of matches(ctx.html, re)) {
    push(ctx.errors, 'F03', 'MODE_FLOW contains demo-only structure: ' + m[0], lineOf(ctx.html, m.index));
  }
}

export function checkF04HorizontalRailScroll(ctx) {
  if (!/(?:body|\.canvas|\.rail|\.rail-track)\b[^{}]*\{[^{}]*overflow-x\s*:\s*auto/gi.test(ctx.html)
    && !/(?:body|\.canvas|\.rail|\.rail-track)\b[^{}]*\{[^{}]*overflow\s*:\s*auto/gi.test(ctx.html)) {
    push(ctx.errors, 'F04', 'MODE_FLOW rail/canvas must allow horizontal scrolling', 1);
  }
}

export default [checkF01Canvas, checkF02Declarations, checkF03NoDemoShell, checkF04HorizontalRailScroll];
