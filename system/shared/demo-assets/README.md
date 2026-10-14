# Demo material inventory

Public, redistributable materials for common product, feed, message, cart, profile and assistant surfaces. This library contains independent assets, not screenshots of private apps. Each image keeps source/author/license metadata in `catalog.json`; attribution and transformations are documented in `LICENSES.md`.

The host reads compact semantic IDs, selects the slots needed for the task, and mechanically copies those bytes. The library does not fetch network resources. A task-local missing slot may be retrieved by the host; it becomes reusable stock only after source and distribution review.

```sh
node skills/design-forge/scripts/prepare-demo-assets.mjs --context none --list
node skills/design-forge/scripts/prepare-demo-assets.mjs --context none --slots slots.json --output /tmp/new-demo
node skills/design-forge/scripts/create-demo-from-library.mjs --context none --artifact demo --output /tmp/new-showcase
node system/shared/browser/setup-playwright-browser.cjs --check
node system/shared/browser/render-pages.mjs --plan /tmp/new-showcase/render-plan.json --output-dir /tmp/new-render
```

`prepare-demo-assets` exits 2 with a structured missing-slot list when stock does not cover the request. Existing different output bytes are not overwritten. The example generator refuses a nonempty destination; create a new version directory for an iteration. Its components are starting points, not replacements for confirmed interaction/visual specifications.

Private contexts declare their own catalogs under their registered skill roots. Public builds include only this catalog; private plugin builds include the public catalog and the selected context. Raw source fingerprints are deny rules and take precedence over any asset allowlist.

Catalogs and sample data are versioned/hash-bound. Common content is capped at 12 MiB and each private catalog at 8 MiB (assets plus sample-data bytes). A catalog version is not a substitute for file hashes. New catalogs must declare source, scope and safe relative paths; symlinks are refused.

Rendering uses a managed browser cache with no silent system-browser fallback. Install it once per host through the shared setup helper. Browser binaries are not packaged with this library. Measure cold launch and browser-reused export separately; script milliseconds are not host reasoning or complete delivery time.
