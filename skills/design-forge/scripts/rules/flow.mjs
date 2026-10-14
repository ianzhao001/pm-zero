import { hasClass, matches, push, lineOf } from '../../../../system/shared/context-package-core/preflight-core/engine.mjs';

function isStoryCanvas(ctx) {
  return /FLOW_VARIANT:\s*STORY_CANVAS|data-flow-variant\s*=\s*["']story-canvas["']|window\.STORY_FLOW|\bstory-canvas\b/i.test(ctx.html);
}

function storyScreenMatches(ctx) {
  return matches(ctx.html, /<article\b(?=[^>]*\bdata-screen-id\s*=)[\s\S]*?<\/article>/gi);
}

function visibleText(html) {
  return String(html)
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function checkF01Canvas(ctx) {
  if (isStoryCanvas(ctx)) {
    if (!hasClass(ctx.html, 'story-canvas') && !hasClass(ctx.html, 'flow') && !hasClass(ctx.html, 'canvas')) {
      push(ctx.errors, 'F01', 'STORY_CANVAS requires .story-canvas, .flow, or .canvas container', 1);
    }
    return;
  }
  if (!hasClass(ctx.html, 'canvas') && !/id\s*=\s*["']canvas["']/i.test(ctx.html)) {
    push(ctx.errors, 'F01', 'MODE_FLOW requires a canvas container', 1);
  }
}

export function checkF02Declarations(ctx) {
  if (isStoryCanvas(ctx)) {
    if (!/window\.STORY_FLOW/.test(ctx.html) || storyScreenMatches(ctx).length < 3) {
      push(ctx.errors, 'F02', 'STORY_CANVAS requires article[data-screen-id] screens and window.STORY_FLOW', 1);
    }
    return;
  }
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
  if (!/(?:body|\.canvas|\.rail|\.rail-track|\.story-canvas|\.flow)\b[^{}]*\{[^{}]*overflow-x\s*:\s*auto/gi.test(ctx.html)
    && !/(?:body|\.canvas|\.rail|\.rail-track|\.story-canvas|\.flow)\b[^{}]*\{[^{}]*overflow\s*:\s*auto/gi.test(ctx.html)) {
    push(ctx.errors, 'F04', 'MODE_FLOW rail/canvas must allow horizontal scrolling', 1);
  }
}

export function checkF05StoryCanvasScreens(ctx) {
  if (!isStoryCanvas(ctx)) return;
  const screens = storyScreenMatches(ctx);
  if (screens.length < 3) {
    push(ctx.errors, 'F05', 'STORY_CANVAS requires at least 3 screen articles', 1);
    return;
  }
  for (const screen of screens) {
    if (!/\bphone-shell\b[\s\S]*\bphone-screen\b/i.test(screen[0])) {
      push(ctx.errors, 'F05', 'each STORY_CANVAS screen requires visible .phone-shell > .phone-screen', lineOf(ctx.html, screen.index));
      return;
    }
    const copy = visibleText(screen[0]);
    if (copy.length < 24 || /\b(?:blank-screen|empty-screen)\b/i.test(screen[0])) {
      push(ctx.errors, 'F05', 'STORY_CANVAS screens cannot be blank or evidence-only shells', lineOf(ctx.html, screen.index));
      return;
    }
  }
}

export function checkF06StoryCanvasReport(ctx) {
  if (!isStoryCanvas(ctx)) return;
  if (!/\bjourney-report\b|data-report\s*=\s*["']journey["']/i.test(ctx.html)) {
    push(ctx.errors, 'F06', 'STORY_CANVAS requires a visible journey report block', 1);
    return;
  }
  if (!/\bmetric-card\b/i.test(ctx.html)) {
    push(ctx.errors, 'F06', 'STORY_CANVAS requires visible metric cards', 1);
    return;
  }
  if (!/\bthought-card\b/i.test(ctx.html)) {
    push(ctx.errors, 'F06', 'STORY_CANVAS requires visible design thought cards', 1);
  }
}

export default [
  checkF01Canvas,
  checkF02Declarations,
  checkF03NoDemoShell,
  checkF04HorizontalRailScroll,
  checkF05StoryCanvasScreens,
  checkF06StoryCanvasReport,
];
