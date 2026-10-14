# Shared Browser Helpers

`system/shared/browser/playwright-browser.cjs` centralizes Playwright package resolution, managed Chromium launch, sandbox-aware error messages, and optional system Chrome fallback locking.

Use it for rendered validators that need a real browser. Skill-specific scripts may keep thin wrappers for naming and environment contracts, but they should not duplicate Playwright discovery or Chrome fallback code.

## Environment

- Default mode is managed Chromium.
- Set the skill-specific browser env var to `chrome` only when system Chrome fallback is intentionally required.
- Browser checks may need Codex escalation in local sandboxes.

## Entrypoints

- `node system/shared/browser/test-playwright-browser.cjs`
- `node system/shared/browser/setup-playwright-browser.cjs --check`
- `node system/shared/browser/setup-playwright-browser.cjs --install`

## Reusable PNG export

`node system/shared/browser/render-pages.mjs --plan <render-plan.json> --output-dir <new-dir>` uses the same managed browser discovery and requires no system Chrome profile. The plan supplies `schema_version:1`, a viewport, device scale, and nonempty pages with `id`, relative HTML `file`, optional route `fragment`, screenshot `selector`, and relative PNG `output`.

The exporter blocks HTTP(S), waits for local images/fonts, checks basic layout, and records input/output hashes and phase timings. If an `asset-receipt.json` exists next to the plan, its bytes and selected asset hashes are checked before and after capture. Source/plan drift fails; an existing PNG/report or symlink destination is not overwritten. Input authoring/preflight and independent visual/behavior acceptance remain separate.

Cold timing means a new browser process, not a flushed OS/font cache. Call exported `createRenderBrowser()` once and pass that browser to `renderPages()` for a warm batch; the caller closes it. Browser binaries stay in the host cache, never in a published material package.
