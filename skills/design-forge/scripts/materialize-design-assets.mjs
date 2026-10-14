#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const value = name => {
  const inline = args.find(arg => arg.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : "";
};
const input = value("input");
const output = value("output") || input;
const cssFiles = args.filter(arg => arg.startsWith("--css=")).map(arg => path.resolve(arg.slice(6)));
const marker = value("marker") || "<!-- DESIGN_ASSETS -->";
const mode = value("materialization") || "inline";
const assetDir = value("asset-dir");

if (!input || !output || !cssFiles.length || !["inline", "copy", "link"].includes(mode)) {
  console.error("Usage: materialize-design-assets.mjs --input <html> [--output <html>] --css=<file> [--css=<file>] [--materialization inline|copy|link] [--asset-dir <dir>]");
  process.exit(2);
}
const html = fs.readFileSync(input, "utf8");
if (!html.includes(marker)) throw new Error(`Missing asset marker: ${marker}`);
for (const file of cssFiles) if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`Missing CSS asset: ${file}`);

let replacement = "";
const records = [];
if (mode === "inline") {
  replacement = cssFiles.map((file, index) => {
    const bytes = fs.readFileSync(file);
    const id = `asset-${index}-${path.basename(file).replace(/[^A-Za-z0-9_-]/g, "-")}`;
    records.push({ id, source: file, bytes });
    return `<style data-design-asset="${id}">${bytes.toString("utf8")}</style>`;
  }).join("\n");
} else {
  const targetDir = mode === "copy" ? path.resolve(assetDir || path.join(path.dirname(output), "assets")) : null;
  if (targetDir) fs.mkdirSync(targetDir, { recursive: true });
  replacement = cssFiles.map(file => {
    const sourceBytes = fs.readFileSync(file);
    const target = targetDir ? path.join(targetDir, path.basename(file)) : file;
    if (targetDir) fs.copyFileSync(file, target);
    const targetBytes = fs.readFileSync(target);
    if (!sourceBytes.equals(targetBytes)) throw new Error(`Asset byte mismatch: ${file} -> ${target}`);
    records.push({ source: file, target, bytes: sourceBytes });
    const href = path.relative(path.dirname(path.resolve(output)), target).split(path.sep).join("/");
    return `<link rel="stylesheet" href="${href}">`;
  }).join("\n");
}

const materialized = html.replace(marker, replacement);
fs.writeFileSync(output, materialized);
const written = fs.readFileSync(output, "utf8");
if (mode === "inline") for (const record of records) {
  const start = `<style data-design-asset="${record.id}">`;
  const from = written.indexOf(start);
  const to = written.indexOf("</style>", from + start.length);
  if (from < 0 || to < 0 || !Buffer.from(written.slice(from + start.length, to)).equals(record.bytes)) throw new Error(`Inline asset byte mismatch: ${record.source}`);
}
console.log(JSON.stringify({ output: path.resolve(output), materialization: mode, asset_files: cssFiles, asset_bytes: records.reduce((sum, record) => sum + record.bytes.length, 0), byte_verified: true }));
