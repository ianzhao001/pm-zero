import { push } from '../../../../system/shared/context-package-core/preflight-core/engine.mjs';

export function checkD01Shell(ctx) {
  const hasBody = /\.(?:body-container|app-body)/.test(ctx.html);
  const hasChromeOrShell = /\.(?:chrome-layer|phone-screen)/.test(ctx.html);
  if (!hasBody || !hasChromeOrShell) {
    push(ctx.errors, 'D01', 'MODE_DEMO requires a visible app body inside the phone surface', 1);
  }
}

export function checkD02MotionGlass(ctx) {
  if (!/--ease-(?:standard|ios)/.test(ctx.html) || !/(?:animation|transition)\s*:/.test(ctx.html)) {
    push(ctx.errors, 'D02', 'MODE_DEMO requires motion tokens and visible animation or transition behavior', 1);
  }
  if (/data-(?:theme|demo-theme)=["']liquid-glass["']/i.test(ctx.html) && !/backdrop-filter/.test(ctx.html)) {
    push(ctx.errors, 'D02', 'explicit liquid-glass theme requires backdrop-filter', 1);
  }
}

export function checkD03Hud(ctx) {
  const names = ['title', 'current', 'kv', 'jump', 'controls', 'log'];
  const count = names.filter(name => {
    const re = new RegExp("class\\s*=\\s*[\"'][^\"']*(?:\\b|[\\s_-])(?:hud[\\s_-])?" + name + "(?:\\b|[\\s_-])[^\"']*[\"']", 'i');
    return re.test(ctx.html);
  }).length;
  if (count < 6) push(ctx.errors, 'D03', 'MODE_DEMO HUD must expose all 6 standard blocks; found ' + count, 1);
}

export function checkD04ReducedMotion(ctx) {
  if (!/prefers-reduced-motion/.test(ctx.html)) {
    push(ctx.warnings, 'D04', 'missing prefers-reduced-motion fallback', 1);
  }
}

export function checkD05WorkbenchCentering(ctx) {
  if (/\.phone-shell\b[^{}]*\{[^{}]*justify-self\s*:\s*end/gi.test(ctx.html)) {
    push(ctx.errors, 'D05', 'demo phone shell must not default to justify-self:end; center the workbench in Chrome', 1);
    return;
  }

  if (!/\.workbench\b[^{}]*\{[^{}]*(?:place-content\s*:\s*center|justify-content\s*:\s*center|margin\s*:\s*0\s+auto)/gis.test(ctx.html)) {
    push(ctx.errors, 'D05', 'demo workbench must declare a centered desktop layout', 1);
  }
}

export default [checkD01Shell, checkD02MotionGlass, checkD03Hud, checkD04ReducedMotion, checkD05WorkbenchCentering];
