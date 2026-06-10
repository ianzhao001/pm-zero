#!/usr/bin/env bash
set -u

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
FIXTURES="$ROOT/skills/dewu/tests/fixtures"
LOG_DIR="$ROOT/work/test-logs-v1.0.4"
mkdir -p "$LOG_DIR"

failures=0

check_json() {
  local output="$1"
  local expected="$2"
  python3 - "$output" "$expected" <<'PY'
import json
import sys
from pathlib import Path

text = Path(sys.argv[1]).read_text(encoding="utf-8")
payload, _ = json.JSONDecoder().raw_decode(text)
expected = sys.argv[2]
errors = payload.get("errors") or [
    issue for issue in payload.get("issues", []) if issue.get("level") == "error"
]
ids = [item.get("rule") or item.get("check_id") for item in errors]
if expected in ids:
    print(f"PASS expected={expected} actual={ids} errors={len(errors)}")
    raise SystemExit(0)
print(f"FAIL expected={expected} actual={ids} errors={len(errors)}")
raise SystemExit(1)
PY
}

run_html() {
  local fixture="$1"
  local expected="$2"
  local out="$LOG_DIR/dewu-negative-${expected}.json"
  node "$ROOT/skills/design-forge/scripts/preflight.mjs" "$FIXTURES/$fixture" --brand-rules="$ROOT/skills/dewu/preflight-rules/brand.mjs" > "$out" 2>&1
  local status=$?
  if [ "$status" -eq 0 ]; then
    echo "FAIL $fixture expected failure for $expected but command passed"
    cat "$out"
    failures=$((failures + 1))
    return
  fi
  if ! check_json "$out" "$expected"; then
    cat "$out"
    failures=$((failures + 1))
  fi
}

run_docx() {
  local fixture="$1"
  local expected="$2"
  local out="$LOG_DIR/dewu-negative-${expected}.json"
  python3 "$ROOT/skills/prd-forge/scripts/validate_prd.py" "$FIXTURES/$fixture" --strict --brand-rules="$ROOT/skills/dewu/preflight-rules/brand.py" > "$out" 2>&1
  local status=$?
  if [ "$status" -eq 0 ]; then
    echo "FAIL $fixture expected failure for $expected but command passed"
    cat "$out"
    failures=$((failures + 1))
    return
  fi
  if ! check_json "$out" "$expected"; then
    cat "$out"
    failures=$((failures + 1))
  fi
}

has_docx_deps() {
  python3 - <<'PY' >/dev/null 2>&1
import docx
import yaml
PY
}

echo "dewu negative tests"
run_html "wrong-tab-order.html" "B02"
run_html "missing-accent.html" "B05"
run_html "legacy-token.html" "B04"
run_html "five-tab-grid.html" "B06"
run_html "red-price.html" "B07"
run_html "text-only-bottom-tabs.html" "B08"
run_html "bottom-tab-active-accent.html" "B09"
run_html "type2-tab-residual.html" "B10"
run_html "type2-tab-shell-combo.html" "B10"
run_html "top-activity-slot-missing.html" "B03"
run_html "single-column-fake-feed.html" "B11"
run_html "filled-bottom-tab-icon.html" "B12"
run_html "mixed-feed-like-icons.html" "B13"
run_html "recommend-tab-invented-chip-row.html" "B14"
run_html "feed-card-auth-new-label.html" "B15"
run_html "local-rule-overrides-screenshot.html" "B16"
run_html "top-active-not-recommend.html" "B17"
run_html "buy-tab-text-only-category.html" "B18"
run_html "buy-spacing-not-screenshot-like.html" "B19"
run_html "mobile-internal-horizontal-overflow.html" "B20"
run_html "uploaded-fonts-ignored.html" "B21"
run_html "profile-header-collapsed.html" "B22"
run_html "screenshot-inner-width-compressed.html" "B23"
run_html "screenshot-rhythm-too-loose.html" "B24"
run_html "screenshot-visible-text-drift.html" "B25"
run_html "screenshot-font-only-no-coordinate.html" "B26"
run_html "long-screenshot-not-scroll-mode.html" "B27"
run_html "detail-page-with-bottom-tab.html" "B28"
run_html "detail-page-missing-hero-overlay.html" "B29"
run_html "feed-long-uniform-card-height.html" "B30"
run_html "profile-scrolled-missing-seller-service-grid.html" "B31"
run_html "commerce-scrolled-product-card-spacing-drift.html" "B32"
run_html "long-scroll-clipped-not-scrollable.html" "B33"
run_html "buy-top-text-drift.html" "B34"
run_html "typography-footprint-drift.html" "B35"
run_html "profile-lower-dashboard-not-scroll-visible.html" "B36"
run_html "scroll-content-height-equals-scroll-height.html" "B33"
run_html "profile-header-too-tall.html" "B37"
run_html "profile-dashboard-grid-stretch.html" "B38"
run_html "profile-module-y-drift.html" "B38"
run_html "profile-order-icons-missing.html" "B39"
run_html "profile-wallet-icons-in-summary.html" "B39"
run_html "profile-service-grid-spacing-drift.html" "B40"
run_html "profile-coupon-empty-space-drift.html" "B40"
run_html "profile-nickname-freeform.html" "B41"
run_html "profile-name-font-too-large.html" "B41"
run_html "all-surface-typography-drift.html" "B42"
run_html "demo-hidden-preflight-evidence.html" "B43"
run_html "demo-visible-tabbar-alias.html" "B43"
if has_docx_deps; then
  run_docx "missing-glossary.docx" "BR03"
  run_docx "missing-funds-owner.docx" "BR02"
else
  echo "SKIP docx PRD negative tests: python-docx or PyYAML is not installed"
fi

if [ "$failures" -gt 0 ]; then
  echo "FAIL dewu negative tests failures=$failures"
  exit 1
fi

echo "PASS dewu negative tests"
