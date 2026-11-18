# Add JayF4n/dsh-poe-cn-guide — Path of Exile guide translation skill

## What this adds

One entry file: `data/plugins/JayF4n__dsh-poe-cn-guide.yml`.

`JayF4n/dsh-poe-cn-guide` bundles a skill that translates Path of Exile build guides into
Chinese using poedb.tw terminology, and can deliver them as Excel where each gem name carries
its real socket colour.

## Meets the listed requirements

| Requirement | Status |
|---|---|
| `dsh.bundle` manifest in `package.json` | ✅ `dsh.bundle.patch` → `./cordis.patch.yml` |
| `cordis.patch.yml` at the repo root | ✅ inserts `poe-cn-guide` |
| Real, working code (not README-only) | ✅ provider in `lib/index.js` + passing test in `test/smoke.mjs` |
| `dsh-plugin` topic | ✅ added |
| Repo at least 1 day old | ⏳ see note below |
| Description states what it does, no superlatives | ✅ |

## Description is accurate — here is the count

The entry claims a **3,134-term glossary** and **817 gem colours**. Both are generated and
checkable in the repo:

```bash
cd skills/poe-cn-guide
node -e "const g=require('./data/glossary.json').entries;console.log(Object.keys(g).length)"
# 3134
node -e "const c=require('./data/gem-colors.json').colors;console.log(Object.keys(c).length)"
# 817
```

By kind: skill 564, support 274, unique 1242, notable 992, keystone 57, spectre 3, boss 1,
mechanic 1.

## How it is verified

```bash
pnpm install --config.node-linker=hoisted && node test/smoke.mjs
# {"ok":true,"entry":"poe-cn-guide","entries":3134,"gems":817,"warnings":1}
```

The test drives the skill provider with a stubbed `ctx.skills`, loads the skill body, then
reads `data/glossary.json` through the catalog entry's `resourceBase` — proving the payload
ships with the package rather than happening to be reachable on disk.

## Category

`skill` — the plugin provides capability through the DSH skill registry. It is not UI, not a
model, not a theme.

## Data provenance

Chinese names come from [poedb.tw/cn](https://poedb.tw/cn/), an unofficial community wiki;
English names and base types are joined by shared id from poedb.tw/us. The package ships name
mappings only, no page content. Game names and texts belong to Grinding Gear Games; this
plugin is not affiliated with or endorsed by GGG or poedb.
