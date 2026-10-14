#!/usr/bin/env node
// design-forge reference doc budget & filler guard (v1.0.9).
// Fails when a reference exceeds its char budget or contains bulk-duplicated filler lines.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const BUDGETS = {
  "SKILL.md": 5500,
  "references/ds-spec.lock.md": 4000,
  "references/methodology/interactive-demo-system.md": 10000,
  "references/methodology/flow-canvas-recipe.md": 6000,
  "references/methodology/checklist.md": 4500,
  "references/methodology/do-and-dont.md": 2500,
  "references/methodology/visual-quality-bar.md": 4500,
  "references/methodology/mobile-craft.md": 2500,
  "references/methodology/atom-defaults.md": 3000,
  "references/interaction-feedback-patterns.md": 7000,
};

const failures = [];

for (const [rel, budget] of Object.entries(BUDGETS)) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    failures.push(`${rel}: missing file`);
    continue;
  }
  const text = fs.readFileSync(abs, "utf8");
  if (text.length > budget) {
    failures.push(`${rel}: ${text.length} chars exceeds budget ${budget}`);
  }
}

// Filler guard: any long line duplicated many times inside one reference is bulk noise.
const mdFiles = [];
(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    if (fs.statSync(abs).isDirectory()) walk(abs);
    else if (name.endsWith(".md")) mdFiles.push(abs);
  }
})(path.join(ROOT, "references"));

for (const abs of mdFiles) {
  const counts = new Map();
  for (const raw of fs.readFileSync(abs, "utf8").split(/\r?\n/)) {
    const line = raw.replace(/^\s*-\s*\d+\.\s*/, "").trim();
    if (line.length < 50) continue;
    counts.set(line, (counts.get(line) || 0) + 1);
  }
  for (const [line, count] of counts) {
    if (count > 3) {
      failures.push(`${path.relative(ROOT, abs)}: filler line repeated ${count}x: "${line.slice(0, 60)}..."`);
    }
  }
}

if (failures.length > 0) {
  console.error("FAIL design-forge doc budget");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("PASS design-forge doc budget");
