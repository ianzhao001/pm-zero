#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../../..");

function read(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    return { rel, abs, text: "", exists: false };
  }
  return { rel, abs, text: fs.readFileSync(abs, "utf8"), exists: true };
}

function includesAll(file, terms) {
  return terms.filter((term) => !file.text.includes(term));
}

const files = {
  runbook: read("skills/dewu/ds-pack/screenshot-absorption-runbook.md"),
  evidence: read("skills/dewu/ds-pack/screenshot-evidence-pack.md"),
  contract: read("skills/dewu/examples/hifi-prompt-contract.md"),
  skill: read("skills/dewu/SKILL.md"),
  brandRules: read("skills/dewu/preflight-rules/brand.mjs"),
  negativeRunner: read("skills/dewu/tests/run-negative-tests.sh"),
  validator: read("skills/dewu/tests/validate-hifi-surface.cjs"),
  demoTests: read("_workspace/test-cases/dewu-tab-wireframe-smoke-20260523/run-skill-detection-demo-tests.cjs"),
};

const checks = [
  {
    name: "runbook exists and is referenced by SKILL.md",
    pass:
      files.runbook.exists &&
      files.skill.text.includes("ds-pack/screenshot-absorption-runbook.md"),
    detail: "Expected Dewu SKILL.md to load ds-pack/screenshot-absorption-runbook.md.",
  },
  {
    name: "runbook contains one-pass workflow sections",
    pass:
      files.runbook.exists &&
      includesAll(files.runbook, [
        "Failure Taxonomy",
        "One-Pass Workflow",
        "Intake Template",
        "Definition of Done",
      ]).length === 0,
    detail: `Missing: ${includesAll(files.runbook, [
      "Failure Taxonomy",
      "One-Pass Workflow",
      "Intake Template",
      "Definition of Done",
    ]).join(", ")}`,
  },
  {
    name: "evidence pack has new screenshot intake template",
    pass:
      includesAll(files.evidence, [
        "New Screenshot Intake Template",
        "source size",
        "CSS viewport",
        "scroll state",
        "surface type",
        "typography footprint",
        "spacing",
        "visible text",
        "negative fixture",
        "rendered-DOM",
      ]).length === 0,
    detail: "Evidence pack must capture geometry, typography, spacing, visible text, negative fixtures and rendered-DOM tests before demo generation.",
  },
  {
    name: "prompt contract enforces evidence-first order",
    pass:
      includesAll(files.contract, [
        "screenshot-absorption-runbook.md",
        "先更新 evidence",
        "validator",
        "negative fixture",
        "proof artifact",
        "不得把 demo",
      ]).length === 0,
    detail: "Prompt contract must require runbook/evidence/validator/negative checks before proof artifacts and forbid demo-as-source.",
  },
  {
    name: "B23-B43 gates remain present in brand rules and negative runner",
    pass:
      ["B23", "B24", "B25", "B26", "B27", "B28", "B29", "B30", "B31", "B32", "B33", "B34", "B35", "B36", "B37", "B38", "B39", "B40", "B41", "B42", "B43"].every((id) =>
        files.brandRules.text.includes(id) && files.negativeRunner.text.includes(id)
      ),
    detail: "Existing screenshot-level gates must stay wired into negative tests.",
  },
  {
    name: "rendered DOM demo validation remains wired",
    pass:
      includesAll(files.validator, ["MODE_DEMO", "data-jump", ".tabbar", "scrollHeight"]).length === 0 &&
      includesAll(files.demoTests, ["tabbarx", "dewu-static-preflight-evidence", "scrollTop", "data-jump"]).length === 0,
    detail: "Validator and demo tests must verify visible rendered DOM, routes, real scroll and hidden-evidence bypasses.",
  },
];

let failed = 0;
for (const check of checks) {
  if (check.pass) {
    console.log(`PASS ${check.name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${check.name}`);
    console.error(`  ${check.detail}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} screenshot absorption readiness check(s) failed.`);
  process.exit(1);
}

console.log("\nDewu screenshot absorption readiness checks passed.");
