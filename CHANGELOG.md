# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Versions follow the DeepSeek Harness release line they were built against — see
`peerDependencies` in `package.json` for the exact host ranges.

## [Unreleased]

## [1.0.0] - 2026-11-18

First release. Ships the `poe-cn-guide` skill as a DSH bundle plugin.

### Added

- **Skill `poe-cn-guide`** — translate Path of Exile build guides into Chinese using
  poedb.tw/cn terminology, and deliver them as Markdown or gem-coloured Excel.
- **Term dictionary, 3,134 entries** keyed by poedb id, each carrying the English name,
  the Chinese name, its kind (`skill` 564, `support` 274, `unique` 1242, `notable` 992,
  `keystone` 57, `spectre` 3, `boss` 1, `mechanic` 1) and, for gems, the socket colour.
- **Gem colour table, 817 gems** — `red` / `green` / `blue` / `white`, read from the poedb
  listing pages. Colour is data, not inference: 启迪（辅） Inspiration Support is *red*,
  and attribute-requirement lines do not imply it.
- **Base-type names** joined across locales by shared id, so a unique carries both its
  English and Chinese base (`Coiled Staff` ↔ `强化长杖`).
- **`scripts/lookup.mjs`** — offline EN↔CN lookup. Several terms per call, `--kind`,
  `--color`, `--id`, `--json`; exits 1 when a term does not resolve instead of returning
  an empty result. Support names normalise both ways, so `秘术增强` finds `秘术增强（辅）`.
- **`scripts/build-glossary.mjs`** — rebuilds both data files from poedb.tw. Aborts rather
  than writing partial data: HTTP error, a suspiciously short page, or a parser that returns
  zero rows all stop the build.
- **Curated overrides** (`data/overrides.json`, 6 terms) for entries the bulk listings do not
  carry — spectres, a boss, a league mechanic, and a colourless gem. Every override is
  re-opened and compared against its recorded Chinese name on each build; a mismatch fails
  the build instead of letting a stale name through.
- **`references/sources.md`** — verified fetch recipes for poedb.tw and mobalytics, with
  measured page sizes and the failure modes that were actually hit (Cloudflare, SPA, the
  100 KB `web_fetch` truncation).
- **`references/xlsx.md`** — the gem-colour palette, rich-text legend recipe, and the Univer
  traps that cost real time (`breakApart()` not `unmerge()`, `setValues` merges, the 20-column
  limit on a freshly created sheet).
- **`lib/index.js`** — registers a `dsh-poe-cn-guide` skill provider at rank 600 (bundled),
  below the filesystem provider's 100–500, so a local `.dsh/skills` copy always wins and this
  package fills in for workspaces that have none.
- **`test/smoke.mjs`** — drives the provider with a stubbed `ctx.skills`: asserts the catalog
  entry and `resourceBase`, loads the body (frontmatter stripped, `rank`/`locator` not leaked),
  then reads the data files **through that resourceBase** to prove the payload travels with
  the package. Also asserts the failure path: a missing `assetRoot` yields an empty but
  complete catalog, invalidates once, and warns — rather than throwing.

### Notes

- Data is stamped with a season (`meta.season`, currently `3.30`). Transfigured gems are
  renamed every league, so re-run the builder and bump the stamp before publishing across a
  league boundary.
- Chinese names come from poedb.tw/cn; English names are joined by shared id from poedb.tw/us.
  poedb is an unofficial community site — if its markup changes the builder stops, which is
  the intended behaviour.
- Local development needs a hoisted install (`pnpm install --config.node-linker=hoisted`);
  pnpm's default isolated store leaves `schemastery` unable to resolve its own dependencies.

[Unreleased]: https://github.com/JayF4n/dsh-poe-cn-guide/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/JayF4n/dsh-poe-cn-guide/releases/tag/v1.0.0
