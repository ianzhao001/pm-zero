import path from 'node:path';
import vm from 'node:vm';

export function lineOf(text, index) {
  return String(text).slice(0, Math.max(0, index)).split(/\r?\n/).length;
}

export function push(list, rule, detail, line = 1) {
  list.push({ rule, detail, line });
}

export function matches(text, re) {
  const out = [];
  const source = String(text);
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(source))) out.push(m);
  return out;
}

export function hasClass(text, name) {
  return new RegExp("class\\s*=\\s*[\"'][^\"']*\\b" + name + "\\b[^\"']*[\"']", 'i').test(text);
}

export function inferMode(html) {
  const source = String(html);
  if (/<!--\s*MODE:\s*MODE_DEMO\s*-->|\/\/\s*MODE:\s*MODE_DEMO/.test(source)) return 'demo';
  if (/<!--\s*MODE:\s*MODE_FLOW\s*-->|\/\/\s*MODE:\s*MODE_FLOW/.test(source)) return 'flow';
  if (/\.chrome-layer|class\s*=\s*["'][^"']*\bhud\b/i.test(source)) return 'demo';
  if (/window\.SCREENS/.test(source)) return 'flow';
  return 'unknown';
}

export function isVersioned(file) {
  const base = path.basename(file || '');
  const normalized = String(file || '').replace(/\\/g, '/');
  return /\/versions\//.test(normalized)
    || /\/v\d+(?:[./_-]|$)/i.test(normalized)
    || /v(?:[2-9]|\d{2,})/i.test(base);
}

export function checkInlineScripts(ctx) {
  const re = /<script\b(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(ctx.html))) {
    const code = m[1];
    const codeStart = m.index + m[0].indexOf('>') + 1;
    const baseLine = lineOf(ctx.html, codeStart);
    try {
      new vm.Script(code);
    } catch (e) {
      const mm = String(e.stack || '').match(/<anonymous>:(\d+):(\d+)/);
      push(ctx.errors, 'JS01', 'JavaScript syntax error: ' + e.message, baseLine + (mm ? Number(mm[1]) - 1 : 0));
    }
  }
}

export class RuleRegistry {
  constructor() {
    this.groups = new Map();
  }

  register(group, rules) {
    const current = this.groups.get(group) || [];
    this.groups.set(group, current.concat(rules));
    return this;
  }

  rulesFor(mode) {
    return [
      ...(this.groups.get('common') || []),
      ...(this.groups.get(mode) || []),
      ...(this.groups.get('version') || []),
      ...(this.groups.get('brand') || []),
    ];
  }
}

export function createContext(html, file, modeArg) {
  const mode = modeArg || inferMode(html);
  return { file, html: String(html), mode, errors: [], warnings: [] };
}

export function runChecks(html, file, modeArg, registry) {
  const ctx = createContext(html, file, modeArg);
  for (const fn of registry.rulesFor(ctx.mode)) fn(ctx);
  return {
    file,
    mode: ctx.mode,
    pass: ctx.errors.length === 0,
    errors: ctx.errors,
    warnings: ctx.warnings,
  };
}

