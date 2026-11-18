#!/usr/bin/env node
// Offline terminology lookup for Path of Exile (EN <-> CN, poedb.tw/cn naming).
// Usage:
//   node scripts/lookup.mjs 电能释放
//   node scripts/lookup.mjs "Righteous Fire" Inspiration
//   node scripts/lookup.mjs --kind support --color red --limit 20
//   node scripts/lookup.mjs --id Lightning_Tendrils --json
// Exit code 1 when any query term has no match (fail loud, never silent empty).

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, "..", "data");

function parseArgs(argv) {
  const terms = [];
  const opts = { kind: null, color: null, id: null, json: false, limit: 8 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--kind") opts.kind = argv[++i];
    else if (a === "--color") opts.color = argv[++i];
    else if (a === "--id") opts.id = argv[++i];
    else if (a === "--limit") opts.limit = Number(argv[++i]) || 8;
    else if (a === "--json") opts.json = true;
    else if (a.startsWith("--")) throw new Error("unknown flag " + a);
    else terms.push(a);
  }
  return { terms, opts };
}

function norm(s) {
  return String(s).toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, " ").trim();
}

// poedb names supports with a trailing "（辅）" / " Support"; people usually type the bare name.
// Strip it on both sides so "秘术增强" finds "秘术增强（辅）".
function bare(s) {
  return norm(s).replace(/（辅）$/, "").replace(/\s*support$/, "").trim();
}

function row(id, rec) {
  return { id, en: rec.en || "", cn: rec.cn, kind: rec.kind, color: rec.color || "", base: rec.base ? rec.base.cn : "" };
}

async function main() {
  const { terms, opts } = parseArgs(process.argv.slice(2));
  const raw = JSON.parse(await readFile(join(DATA, "glossary.json"), "utf8"));
  const entries = raw.entries;

  let pool = Object.entries(entries).map(([id, rec]) => row(id, rec));
  if (opts.kind) pool = pool.filter((r) => r.kind === opts.kind);
  if (opts.color) pool = pool.filter((r) => r.color === opts.color);

  if (terms.length === 0 && !opts.id) {
    const byKind = {};
    for (const r of pool) byKind[r.kind] = (byKind[r.kind] || 0) + 1;
    console.log(JSON.stringify({ season: raw.meta.season, builtAt: raw.meta.builtAt, counts: byKind }));
    return;
  }

  const queries = opts.id ? [opts.id] : terms;
  const out = [];
  let missing = 0;

  for (const q of queries) {
    const nq = norm(q);
    const nqBare = bare(q);
    const exact = pool.filter(
      (r) =>
        r.id.toLowerCase() === nq ||
        norm(r.cn) === nq ||
        norm(r.en) === nq ||
        bare(r.cn) === nqBare ||
        bare(r.en) === nqBare
    );
    const hits = exact.length
      ? exact
      : pool.filter((r) => norm(r.en).includes(nq) || norm(r.cn).includes(nq) || r.id.toLowerCase().includes(nq));
    if (hits.length === 0) {
      missing++;
      out.push({ query: q, matched: 0, results: [] });
      continue;
    }
    out.push({ query: q, matched: hits.length, results: hits.slice(0, opts.limit) });
  }

  if (opts.json) {
    console.log(JSON.stringify({ season: raw.meta.season, out }, null, 1));
  } else {
    for (const group of out) {
      console.log("## " + group.query + (group.matched > group.results.length ? "  (" + group.matched + " matches, showing " + group.results.length + ")" : ""));
      for (const r of group.results) {
        console.log([r.cn, r.en, r.kind, r.color || "-", r.base || ""].join("\t"));
      }
      if (group.matched === 0) console.log("NO MATCH — do not invent a translation; fetch poedb or ask.");
    }
  }
  if (missing > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error("LOOKUP FAILED:", err.message);
  process.exit(2);
});
