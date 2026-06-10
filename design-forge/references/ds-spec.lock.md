# Neutral Mobile DS Lock

This is the default design-system source for `design-forge`. Context-pack overrides must use `../shared/contracts/ds-pack-interface.md`.

## Tokens

```css
:root {
  --accent: #1F6FEB;
  --accent-bright: #388BFD;
  --accent-press: #1158C7;
  --accent-soft: #DDF4FF;
  --danger: #D1242F;
  --success: #1A7F37;
  --warning: #9A6700;
  --n00: #FFFFFF;
  --n-bg: #F5F6F8;
  --n20: #EAEDF0;
  --n40: #D0D7DE;
  --n80: #8C959F;
  --n100: #57606A;
  --n140: #24292F;
}
```

## Typography

```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Noto Sans SC", sans-serif;
```

Use tabular numbers for metrics:

```css
.num {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
```

Avoid hand-written fonts for UI text.

## Type Scale

| Token | Size | Weight | Line-height | Use |
|---|---:|---:|---:|---|
| H1 | 22px | 600 | 140% | page emphasis |
| H2 | 18px | 600 | 145% | section title |
| H3 | 16px | 500 | 150% | module title |
| T1 | 14px | 400 | 155% | body |
| T2 | 12px | 400 | 160% | secondary |
| M1 | 11px | 400 | 160% | metadata |
| M2 | 10px | 400 | 160% | compact metadata |

## Spacing

| Situation | Value |
|---|---|
| dense grid gap | `8px` |
| card padding | `12px` |
| page padding | `20px` |
| navigation horizontal padding | `16px` |

## Radius

| Component | Radius |
|---|---|
| buttons, chips, inputs | `4px` |
| cards | `8px` |
| sheets | `16px 16px 0 0` |
| avatars and dots | `999px` |

## Layout Defaults

- Default tab order: `Home / Search / Activity / Profile`.
- Feed-like surfaces use a two-column grid when the content is visual and card-based.
- Detail pages use a large media or content area plus one bottom primary action.
- Push pages show back navigation and may omit bottom tabs.
- Modal flows must provide visible dismissal.

## Atomic Defaults

| Atom | Required defaults |
|---|---|
| `.btn` | `display:flex; align-items:center; justify-content:center; gap:6px; white-space:nowrap` |
| `.btn.accent` | accent background, white text, 4px radius |
| `.btn.outline` | white background, neutral border |
| `.chip` | compact, 4px radius, neutral or accent-soft selected state |
| `.card` | white background, 8px radius, light border or no shadow |
| `.sheet` | fixed bottom panel, visible scrim, dismissible |
| `.toast` | short copy only, no long paragraphs |

## Lock Rules

1. The neutral accent is `#1F6FEB`.
2. Do not use a one-note palette dominated by one hue family.
3. Keep page backgrounds light unless the user explicitly requests a dark mode.
4. Use a DS Pack for any private product visual system.
5. When a DS Pack is loaded, its tokens override this file without changing generic workflow rules.

## CHANGELOG

- v1.0.4 (2026-05-24) - strengthen generic screenshot evidence absorption: evidence checklist and negative/rendered-DOM gates must precede demo artifacts; brand-specific typography and spacing values remain in DS Packs.
- v1.0.3 (2026-05-23) - require MODE_DEMO rendered-DOM validation: external HUD/demo chrome must not alter phone-internal DS, hidden evidence/template bypasses are invalid, and scrolling feeds/products must end naturally without spacer/min-height blank.
- v1.0.2 (2026-05-23) - add generic screenshot-evidence absorption method and C13 feed-end no artificial blank quality gate; brand-specific typography and spacing remain in DS Packs.
- v1.0.0 (2026-05-14) - neutral lock extracted during three-layer refactor.
