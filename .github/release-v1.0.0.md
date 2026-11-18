# dsh-poe-cn-guide v1.0.0

First release. A DeepSeek Harness plugin that ships the **`poe-cn-guide`** skill:
translate Path of Exile build guides into Chinese with [poedb.tw/cn](https://poedb.tw/cn/)
terminology, and deliver them as Markdown or gem-coloured Excel.

## What you get

| | |
|---|---|
| **3,134** | EN↔CN terms: skills, supports, transfigured gems, uniques, notables, keystones, plus spectres, a boss and a league mechanic |
| **817** | gems with their real socket colour — red / green / blue / white |
| **2** | scripts: an offline lookup, and a rebuild from poedb.tw that refuses to write partial data |
| **1** | skill, registered at rank 600 so a local `.dsh/skills` copy always takes precedence |

## Why colour is data, not a guess

The colour of a gem is not derivable from its name or its attribute requirements.
启迪（辅） Inspiration Support is **red**, not blue; 动量（辅） is green; 附加闪电伤害（辅） is blue.
Guessing gets roughly half of them wrong, and a wrong colour in an Excel guide makes the
sheet useless for the thing it is for — colour-coding the links while you level.

## Install

From the plugin market once listed, or locally:

```bash
cd dsh-poe-cn-guide && pnpm install --config.node-linker=hoisted && pnpm test
```

Copy the folder to `~/.dsh/profiles/<profile>/node_modules/dsh-poe-cn-guide`, then add to that
profile's `cordis.patch.yml`:

```yaml
- insert:
    - id: poe-cn-guide
      name: 'dsh-poe-cn-guide'
```

Restart the app so the profile bundle reloads.

## Verify it worked

```bash
node test/smoke.mjs
# {"ok":true,"entry":"poe-cn-guide","entries":3134,"gems":817,"warnings":1}
```

The test drives the provider with a stubbed `ctx.skills`, loads the skill body, then reads
`data/glossary.json` **through the catalog entry's `resourceBase`** — proving the payload
travels with the package rather than happening to be reachable on disk. It also covers the
failure path: a missing `assetRoot` yields an empty-but-complete catalog and warns, instead of
taking the skill system down with it.

## Data provenance

Chinese names come from poedb.tw/cn; English names and base types are joined by shared id from
poedb.tw/us. The stamp is season **3.30** — transfigured gems are renamed every league, so
re-run `node scripts/build-glossary.mjs --season <next>` before crossing a league boundary.

poedb is an unofficial community site. If its markup changes the builder stops rather than
writing a half-built dictionary — a stale answer is worse than no answer here.

## Requirements

- DeepSeek Harness `0.2.x` (`@deepseek-ai/dsh-skill` peer range covers `0.2.0-rc.1`,
  `0.2.1-rc.3`, `0.2.2-rc.3`)
- Node.js `>=22.19.0`

## Licence

MIT. Game names and texts belong to Grinding Gear Games; terminology is gathered from
poedb.tw and this package is not affiliated with or endorsed by either.
