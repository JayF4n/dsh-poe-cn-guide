# poe-cn-guide

A skill package for translating Path of Exile build guides into Chinese with
[poedb.tw/cn](https://poedb.tw/cn/) terminology, and for delivering them as Excel where every
gem name carries its real socket colour (红 / 绿 / 蓝 / 白).

## Contents

```
poe-cn-guide/
├─ SKILL.md                      # the instructions the agent loads
├─ data/glossary.json            # 3134 entries (skill 564, support 274, unique 1242, notable 992,
│                                #   keystone 57, spectre 3, boss 1, mechanic 1)
├─ data/gem-colors.json          # 817 gems → red / green / blue / white
├─ data/overrides.json           # 6 curated terms, re-verified against poedb on every build
├─ scripts/lookup.mjs            # offline EN↔CN lookup, exit 1 on miss
├─ scripts/build-glossary.mjs    # rebuild data/ from poedb.tw
└─ references/
   ├─ sources.md                 # poedb + mobalytics fetch recipes, verified sizes, failure modes
   └─ xlsx.md                    # gem-coloured Excel: palette, rich text, Univer traps
```

## Install

Drop this directory into one of the roots `@deepseek-ai/dsh-skill-filesystem` scans
(highest priority first):

| Rank | Source | Path |
|---|---|---|
| 100 | project-dsh | `<projectRoot>/.dsh/skills` |
| 200 | project-agents | `<projectRoot>/.agents/skills` |
| 300 | custom | `Config.customSkillDirs` |
| 400 | user-dsh | `~/.dsh/skills` |
| 500 | user-agents | `~/.agents/skills` |

`<projectRoot>` is the nearest ancestor with `.git`; without one it falls back to the cwd.
A skill is `<name>/SKILL.md` (this layout) or a flat `<name>.md`.

```bash
cp -r poe-cn-guide <projectRoot>/.dsh/skills/     # per-project
cp -r poe-cn-guide ~/.dsh/skills/                # available in every project
```

**No restart needed.** The provider watches these roots and invalidates the catalog on change;
a newly copied skill appears in the running session on the next model step. (Edits below
`references/` or `scripts/` do not trigger a refresh — only SKILL.md frontmatter and
added/renamed/deleted skills do.)

## Use without installing

Point the agent at `SKILL.md` in this folder, or run the lookup directly:

```bash
node scripts/lookup.mjs 电能释放
node scripts/lookup.mjs --id Inspiration_Support --json
```

## Refresh

```bash
node scripts/build-glossary.mjs --season 3.31
```

Needs network access to poedb.tw. The builder writes both data files or nothing; it aborts on
HTTP errors, short pages, or a parser that returns zero rows.

It also re-opens every page in `data/overrides.json` and compares the title with the recorded
Chinese name — a mismatch stops the build:

```
BUILD FAILED: override Allflame: recorded cn="不灭之焰" but poedb now says "不灭之火"
```

That is deliberate: the six curated terms are the ones no listing covers, so they are also the
ones that would rot silently.

## Provenance

Chinese names come from poedb.tw/cn; English names and base types are joined by shared id from
poedb.tw/us. Season stamp: **3.30**, built 2026-11-18.
poedb is an unofficial community site — its markup can change, which is exactly what the
builder's zero-row guard is for.
