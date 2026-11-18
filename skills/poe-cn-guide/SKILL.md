---
name: poe-cn-guide
description: Translate Path of Exile build guides and league-starter write-ups into Chinese using poedb.tw/cn terminology, and deliver them as Markdown or as marked-up Excel where every gem name is coloured red/green/blue/white by its real socket colour. Load when the task mentions Path of Exile, 流放之路, 流亡编年史, league starter, build guide, 天赋/宝石/构筑, gem links, PoB, or asks for PoE terminology lookup.
---

# Path of Exile → Chinese guides

This skill carries the parts of the job that are lookup, not judgement: the term dictionary,
the gem-colour table, and the scraping recipes for the two sites everything comes from.
The translation itself is still yours to write.

## Assets

| Path | What it is |
|---|---|
| `data/glossary.json` | 3134 entries keyed by poedb id: `{ en, cn, kind, color?, base?, source }`. kinds: skill 564, support 274, unique 1242, notable 992, keystone 57, transfigured (inside skill/support), spectre 3, boss 1, mechanic 1 |
| `data/gem-colors.json` | poedb id → `red`/`green`/`blue`/`white` for 817 gems |
| `data/overrides.json` | 6 curated terms outside the bulk listings (spectres, a boss, a league mechanic, a colourless gem). Re-verified against the live page on every build |
| `scripts/lookup.mjs` | offline EN↔CN lookup, exits 1 on no match |
| `scripts/build-glossary.mjs` | rebuild all data from poedb.tw (`--season 3.30`) |

Run with the bundled Node:

```bash
node scripts/lookup.mjs 电能释放
node scripts/lookup.mjs "Righteous Fire" Inspiration      # several terms at once
node scripts/lookup.mjs --kind unique --limit 3 护体之符
node scripts/lookup.mjs --id Lightning_Tendrils --json
node scripts/lookup.mjs --color red --kind support        # red support gems
```

Output rows are `cn<TAB>en<TAB>kind<TAB>color<TAB>base`. A `-` in the colour column means the
gem is colourless (white socket) or the entry is not a gem at all.

Supports are stored with poedb's suffix (`秘术增强（辅）`), but the lookup strips it on both sides,
so `秘术增强`, `秘术增强（辅）`, `Arcane Surge` and `Arcane Surge Support` all resolve to the same row.

Not everything lives in the four bulk listings. Spectres, bosses, league mechanics and
colourless gems need `data/overrides.json` — add an entry there rather than editing the
generated files.

## Non-negotiables

1. **Never invent a name.** Every gem, support, unique, keystone, notable, and base type goes
   through the lookup first. `NO MATCH` means fetch poedb or leave the English in brackets —
   never a plausible-sounding guess. A wrong Chinese gem name makes the whole guide unusable.
2. **Gem colour is data, not intuition.** Take it from `gem-colors.json`. Attribute
   requirement lines lie: 启迪（辅） Inspiration Support *is red*, 动量（辅） is green,
   附加闪电伤害（辅） is blue. Guessing gets roughly half of them wrong.
3. **Fail loud.** If a lookup or fetch returns nothing, stop and say so. Silent empty strings
   become typos in the deliverable.
4. **Copy numbers and links verbatim.** DPS, resistances, trade and PoB URLs are never
   "translated", re-typed, or tidied.
5. **Stamp the season.** Transfigured gems get renamed every league
   (离心之 / 增幅之 电能释放). Put the league version in the header and in `meta.season`.
6. **Curated ≠ asserted.** Anything in `overrides.json` is a claim that must match poedb at build
   time; the builder aborts on a mismatch. Never add an override you have not opened the page for.

## Workflow

1. **Resolve terms first.** Pull the gem links, uniques, and keystones out of the source, run
   them through `lookup.mjs`, and collect every miss. Chase the misses before translating,
   not after — a miss in paragraph 40 rewrites paragraph 3.
2. **Fetch the source.** See `references/sources.md`. mobalytics is an SPA behind Cloudflare;
   generic readers fail. Full-page HTML + tag stripping is the reliable path.
3. **Translate by section, not by sentence.** Keep the author's progression spine
   (act → swap → maps → endgame tiers). Preserve the author's emphases, drop their filler.
4. **Deliver.** Markdown for reading; Excel when the user wants a checklist they tick off
   while playing — see `references/xlsx.md` for the colouring recipe and the Univer traps.
5. **Read back.** Re-read the produced file and confirm every gem name carries the right
   colour and the right Chinese name. Do not trust that the write succeeded.

## Judgement that stays with you

- Which tiers, warnings, and crafting steps actually matter to a reader; what to demote to a note.
- Whether an author's claim is worth repeating ("unethical damage") or should be restated plainly.
- When the source is thin — say so in the deliverable rather than padding it.

## Refreshing the dictionary

```bash
node scripts/build-glossary.mjs --season 3.31
```

The builder aborts rather than writing partial data: it fails if a page errors, if the body is
suspiciously short, or if a parser returns zero rows (the signal that poedb changed its markup).
After a league change, rerun it and diff `meta.counts` before trusting the result.
