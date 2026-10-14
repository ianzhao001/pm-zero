# Inventory-first Assets

Use for high-fidelity photos, product images, avatars and media thumbnails. Source screenshots/recordings/frames are evidence, never stock.

## Select

Honor explicitly usable user assets first, then current-context stock, then public stock. Run `prepare-demo-assets.mjs --context <id> --list`; define slots with id/tags/count/relevance (optional asset_id), then `--slots <json> --output <dir>`. Distinct images are default; allow_reuse is only for the same product/control across pages.

Only retrieve the reported missing slots (exit 2). Do not refetch hits or substitute unrelated images. Match copy to a category substitute. Newly fetched assets remain task-local until provenance, redistribution permission, hash and scope are reviewed for catalog inclusion. A URL alone is not distribution approval.

## Bind

New HTML uses `ASSET_POLICY: INVENTORY_FIRST`, one JSON script with id `asset-manifest`, and data-asset-id on every image. Each image has one fixed local src; srcset/picture are unsupported.

Preset receipts bind id/file/sha256/catalog_id/catalog_version/catalog_sha256, origin `preset`, source and relevance. Retrieved items use origin `retrieved`, actual query/source and local file/hash. User/generated items require explicit authorization provenance. Do not describe generated art as photography. Cataloged vectors keep original provenance.

Legacy SEARCHED_RELEVANT and data-only window.ASSET_MANIFEST literals remain supported. Validation parses data without executing code and checks image IDs, actual bytes and context. Keep source/license attribution in the delivery.

## Reject

Unknown or cross-context assets; altered hashes; original evidence renamed as stock; inline data images; ambiguous HTML attributes; invented provenance; unrelated category substitutions; repeated photos when distinct slots were required. Inventory validation does not prove visual quality or license authenticity. Use stable product data across pages and retain independent visual review.
