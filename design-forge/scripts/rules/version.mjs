import { isVersioned, push } from '../../../../system/shared/context-package-core/preflight-core/engine.mjs';

export function checkV01VersionBlock(ctx) {
  if (!isVersioned(ctx.file)) return;
  const hasBlock = /<!--\s*VERSION:/.test(ctx.html)
    && /<!--\s*CHANGES:/.test(ctx.html)
    && /<!--\s*BASED ON:/.test(ctx.html);
  if (!hasBlock) {
    push(ctx.errors, 'V01', 'versioned HTML requires VERSION / CHANGES / BASED ON comments', ctx.html.split(/\r?\n/).length);
  }
}

export default [checkV01VersionBlock];
