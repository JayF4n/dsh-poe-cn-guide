# dsh-poe-cn-guide

A DeepSeek Harness plugin that ships the **poe-cn-guide** skill: translate Path of Exile build
guides into Chinese with [poedb.tw/cn](https://poedb.tw/cn/) terminology, and deliver them as
Excel where every gem name carries its real socket colour.

Installing this package makes the skill available in **every** workspace, because the plugin
registers its own skill provider instead of relying on a scanned directory.

## Contents

```
dsh-poe-cn-guide/
├─ lib/index.js                  # skill provider (list/get), rank 600
├─ cordis.patch.yml              # bundle layer: mounts the provider
├─ skills/poe-cn-guide/          # the skill payload
│  ├─ SKILL.md                   # dictionary pointer, workflow, non-negotiables
│  ├─ data/glossary.json         # 3134 EN↔CN terms + gem colours + base types
│  ├─ data/gem-colors.json       # 817 gems → red / green / blue / white
│  ├─ data/overrides.json        # 6 curated terms, re-verified on every build
│  ├─ scripts/lookup.mjs         # offline EN↔CN lookup
│  ├─ scripts/build-glossary.mjs # rebuild data/ from poedb.tw
│  └─ references/                # fetch recipes, Excel-colouring notes
└─ test/smoke.mjs                # provider + packaged-data assertions
```

## Install

### Local folder (development / private use)

```bash
cd dsh-poe-cn-guide && pnpm install && pnpm test
```

Put the package where the profile resolves plugins, e.g.
`~/.dsh/profiles/<profile>/node_modules/dsh-poe-cn-guide`, and add this to that profile's
`cordis.patch.yml`:

```yaml
- insert:
    - id: poe-cn-guide
      name: 'dsh-poe-cn-guide'
```

Restart the app so the profile bundle reloads.

### Marketplace

Once published, install it from the plugin market panel. `dshmarket` reads
`dsh.bundle.patch` from `package.json` and mounts `cordis.patch.yml` automatically.

## Verify

```bash
pnpm install --config.node-linker=hoisted   # see "Dependencies" below
node test/smoke.mjs
# {"ok":true,"entry":"poe-cn-guide","entries":3134,"gems":817,"warnings":1}
```

The test imports `lib/index.js` with a fake `ctx.skills`, asserts the catalog entry and its
`resourceBase`, loads the body, then reads `data/glossary.json` **through that resourceBase**
to prove the payload travels with the package. It also asserts that a missing `assetRoot`
degrades to an empty-but-complete catalog and invalidates, instead of throwing.

## After installing

```bash
cd <skill resourceBase>        # printed by the catalog
node scripts/lookup.mjs 电能释放
node scripts/build-glossary.mjs --season 3.31   # refresh the dictionary
```

## Dependencies

| Package | Type | Why |
|---|---|---|
| `yaml` | dependency | parses the SKILL.md frontmatter |
| `@deepseek-ai/schemastery` | peer | the `Config` schema the loader validates; the host provides it |
| `@deepseek-ai/dsh-skill` | peer (optional) | skill registry types; not imported at runtime |

Runtime peers are declared, not bundled: the DSH profile already ships them, and a second copy
of a Cordis plugin package is the classic way to get two registries in one process.

### Local development needs a hoisted install

pnpm's default isolated store puts `schemastery`'s own dependencies
(`@deepseek-ai/cosmokit`, `@standard-schema/spec`) somewhere the package cannot resolve at
runtime on this host, so `node test/smoke.mjs` fails with `ERR_MODULE_NOT_FOUND`. Install
hoisted — it also mirrors what the profile provides in production:

```bash
pnpm install --config.node-linker=hoisted
```

(A committed `.npmrc` would do the same, but such files are commonly blocked by policy because
they can carry registry tokens. Keep the flag on the command line.)

## Difference from the plain-folder skill

| | folder in `.dsh/skills` | this plugin |
|---|---|---|
| Scope | one project (`~/.dsh/skills` for all) | every workspace using the bundle |
| Update | copy files | reinstall the package version |
| Discovery | filesystem provider scans the root | package registers a provider at rank 600 |

The payload is identical, so both can coexist: the filesystem skill wins at rank 100–500,
this package fills in at 600 for workspaces that have no local copy.

## Licence and provenance

MIT. Chinese names come from poedb.tw/cn; English names and base types are joined by shared
id from poedb.tw/us. poedb is an unofficial community site — `build-glossary.mjs` aborts
rather than writing partial data when its markup changes.
