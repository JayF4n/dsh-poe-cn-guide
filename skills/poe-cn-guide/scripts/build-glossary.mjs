#!/usr/bin/env node
// Rebuild data/glossary.json and data/gem-colors.json from poedb.tw listings.
// Usage: node scripts/build-glossary.mjs [--season 3.30]
// Requires network access to poedb.tw. Fails loudly instead of writing partial data.

import { writeFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const DATA = join(ROOT, "data");

const SEASON = process.argv.includes("--season")
  ? process.argv[process.argv.indexOf("--season") + 1]
  : "unknown";

const UA = { "user-agent": "Mozilla/5.0 (compatible; poe-cn-guide skill builder)" };

// category -> english page path (the /cn twin is fetched with the same slug)
const PAGES = [
  { kind: "skill", slug: "Skill_Gems", parser: "gem" },
  { kind: "support", slug: "Support_Gems", parser: "gem" },
  { kind: "transfigured", slug: "Transfigured_Gems", parser: "gem" },
  { kind: "unique", slug: "Unique_item", parser: "unique" },
  { kind: "keystone", slug: "Keystone", parser: "passive" },
  { kind: "notable", slug: "Notable", parser: "passive" },
];

async function get(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
  const html = await res.text();
  if (html.length < 5000) throw new Error("suspiciously short page (" + html.length + "B): " + url);
  return html;
}

function parseGems(html) {
  const out = new Map();
  const re = /class="gem_(red|green|blue|white)"[^>]*href="\/(?:cn|us)\/([^"]+)"[^>]*>([^<]+)<\/a>/g;
  let m;
  while ((m = re.exec(html))) {
    const id = decodeURIComponent(m[2]);
    if (!out.has(id)) out.set(id, { color: m[1], name: m[3].trim() });
  }
  return out;
}

// Colourless gems (Pact of Lycia, Quickstep, Portal, Convocation ...) are rendered with
// class="gemitem" instead of gem_<colour>, so the colour parser above misses them.
function parseColourlessGems(html, into) {
  const re = /<a class="gemitem"[^>]*href="\/(?:cn|us)\/([^"]+)"[^>]*>([^<]*)<\/a>/g;
  let m;
  let added = 0;
  while ((m = re.exec(html))) {
    const id = decodeURIComponent(m[1]);
    const name = m[2].trim();
    if (!name || into.has(id)) continue;
    into.set(id, { color: null, name });
    added++;
  }
  return added;
}

function parseUniques(html) {
  const out = new Map();
  const re = /<a class="UniqueItem"[^>]*href="\/(?:cn|us)\/([^"]+)"[^>]*><span class="uniqueName">([^<]+)<\/span>(?:\s*<span class="uniqueTypeLine">([^<]*)<\/span>)?/g;
  let m;
  while ((m = re.exec(html))) {
    const id = m[1];
    if (!out.has(id)) out.set(id, { name: m[2].trim(), base: (m[3] || "").trim() });
  }
  return out;
}

function parsePassives(html) {
  const out = new Map();
  const re = /<a class="PassiveSkills"[^>]*href="(?:\/cn\/)?([^"]+)"[^>]*>([^<]+)<\/a>/g;
  let m;
  while ((m = re.exec(html))) {
    const id = m[1];
    if (!out.has(id)) out.set(id, { name: m[2].trim() });
  }
  return out;
}

const PARSERS = { gem: parseGems, unique: parseUniques, passive: parsePassives };

async function main() {
  const entries = {};
  const gemColors = {};
  const report = [];

  for (const page of PAGES) {
    const parse = PARSERS[page.parser];
    const [cnHtml, enHtml] = await Promise.all([
      get("https://poedb.tw/cn/" + page.slug),
      get("https://poedb.tw/us/" + page.slug),
    ]);
    const cn = parse(cnHtml);
    const en = parse(enHtml);
    if (cn.size === 0) throw new Error("parsed 0 rows from cn/" + page.slug + " — poedb markup likely changed");
    let colourless = 0;
    if (page.parser === "gem") {
      // both locales need this: the English page uses the same gemitem class, and without
      // parsing it the joined record keeps en:"" (only the Chinese name survives)
      colourless = parseColourlessGems(cnHtml, cn);
      parseColourlessGems(enHtml, en);
    }

    let joined = 0;
    let untranslated = 0;
    for (const [id, c] of cn) {
      const e = en.get(id);
      const enName = e ? e.name : "";
      // poedb sometimes prints the English name on the Chinese page (e.g. a "Clarity" row
      // inside the support listing). Such a row carries no translation and must never
      // shadow a real one.
      const untranslatedRow = enName !== "" && c.name === enName;
      if (untranslatedRow) untranslated++;

      const rec = { en: enName, cn: c.name, kind: page.kind, source: page.slug };
      if (c.color) rec.color = c.color;
      if (c.base || (e && e.base)) rec.base = { en: e ? e.base : "", cn: c.base };

      const prev = entries[id];
      if (!prev) {
        entries[id] = rec;
      } else if (prev.cn === prev.en && !untranslatedRow) {
        // upgrade an untranslated row wherever the real name turns up later
        entries[id] = rec;
      }
      // first page wins the colour (skills > supports > transfigured)
      if (c.color && !gemColors[id]) gemColors[id] = c.color;
      if (e) joined++;
    }
    report.push({ page: page.slug, cn: cn.size, en: en.size, joined, untranslated, colourless });
  }

  // ---- curated overrides: verified against the live page every build ----
  const overrides = await loadOverrides();
  const verified = [];
  for (const [id, o] of Object.entries(overrides.entries)) {
    const html = await get("https://poedb.tw/cn/" + id);
    const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || "";
    const live = title.replace(/\s*-\s*流亡编年史.*$/, "").trim();
    if (!live) throw new Error("override " + id + ": could not read a title from poedb");
    if (live !== o.cn) {
      throw new Error(
        "override " + id + ": recorded cn=\"" + o.cn + "\" but poedb now says \"" + live +
        "\" — fix data/overrides.json before trusting this build"
      );
    }
    verified.push(id);
    if (!entries[id]) {
      entries[id] = { en: o.en, cn: o.cn, kind: o.kind, source: "overrides" };
    } else if (entries[id].cn !== o.cn) {
      throw new Error("override " + id + " disagrees with the scraped listing (" + entries[id].cn + ")");
    }
  }
  if (verified.length) report.push({ page: "overrides", verified: verified.length, ids: verified });

  await mkdir(DATA, { recursive: true });
  const meta = {
    source: "https://poedb.tw",
    season: SEASON,
    builtAt: new Date().toISOString(),
    counts: report,
  };
  await writeFile(join(DATA, "glossary.json"), JSON.stringify({ meta, entries }, null, 1) + "\n", "utf8");
  await writeFile(join(DATA, "gem-colors.json"), JSON.stringify({ meta, colors: gemColors }, null, 0) + "\n", "utf8");
  console.log(JSON.stringify({ ok: true, entries: Object.keys(entries).length, gems: Object.keys(gemColors).length, report }));
}

async function loadOverrides() {
  try {
    return JSON.parse(await readFile(join(DATA, "overrides.json"), "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return { meta: {}, entries: {} };
    throw new Error("data/overrides.json is unreadable: " + err.message);
  }
}

main().catch((err) => {
  console.error("BUILD FAILED:", err.message);
  process.exit(1);
});
