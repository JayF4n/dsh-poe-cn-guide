# Where the content comes from, and how to get it

Everything here was verified by actually fetching these pages in a real session.
Expected sizes are from that run; a wildly different size means the page changed.

## 1. poedb.tw/cn — the naming authority

The Chinese page title is the term:

```
https://poedb.tw/cn/Lightning_Tendrils
<title>电能释放 - 流亡编年史, Path of Exile Wiki cn</title>
```

Strip everything from `" - 流亡编年史"` onward and you have the official cn name. One request
per term, no parsing. This is the fallback for anything the dictionary misses.

**Listing pages carry bulk data.** Prefer these to N single-page requests:

| URL | Yields |
|---|---|
| `/cn/Skill_Gems`, `/us/Skill_Gems` | ~556 active gems: id, cn/en name, socket colour |
| `/cn/Support_Gems`, `/us/Support_Gems` | ~262 support gems |
| `/cn/Transfigured_Gems`, `/us/Transfigured_Gems` | ~218 transfigured gems (renamed every league) |
| `/cn/Unique_item`, `/us/Unique_item` | ~1242 uniques + their base type (2.2–2.5 MB) |
| `/cn/Keystone`, `/us/Keystone` | ~90 keystones |
| `/cn/Notable`, `/us/Notable` | ~1000 notables, cluster notables included (1.5 MB) |

Anchor patterns (stable enough for the builder, which is where they belong — do not hand-parse):

```html
<a class="gem_red" ... href="/cn/Inspiration_Support">启迪（辅）</a>
<a class="UniqueItem" href="/cn/Xirgils_Crank"><span class="uniqueName">舍吉的手柄</span> <span class="uniqueTypeLine">强化长杖</span></a>
<a class="PassiveSkills" href="Elemental_Overload">元素超载</a>      <!-- note: no /cn/ prefix -->
```

**Gem colour exists only on the listing pages.** Individual gem pages expose no colour class;
their tag line ("暴击, strength, 辅助") mixes mod tags with attribute requirements and cannot be
trusted either — the requirement line lists *every* attribute the gem needs across levels.

**Both locales use the same id**, so joining `/cn/` and `/us/` pages by id gives EN↔CN pairs for
free — including base types: `Coiled Staff` ↔ `强化长杖`. Watch the href prefix: it is `/cn/` on the
Chinese site, `/us/` on the English one (the builder matches `/(?:cn|us)/`).

Fetch with a normal browser UA. Sizes: gem listings 0.15–0.8 MB, uniques 2.2–2.5 MB.

## 2. mobalytics.gg — the guide itself

```
https://mobalytics.gg/poe/builds/<slug>
```

It is a server-rendered React page (~2.1 MB) wrapped in Cloudflare:

- `web_fetch` truncates at 100 KB — you get the head and the JSON-LD only.
- `r.jina.ai` proxy: connection fails.
- `api.mobalytics.gg` GraphQL: 403 "Just a moment" challenge.
- The JS chunk that issues the query is fetchable but only tells you the query name.

Working path — fetch the whole document yourself, then strip:

```js
const html = await (await fetch(url, { headers: { "user-agent": "Mozilla/5.0 ..." } })).text();
let t = html
  .replace(/<script[\s\S]*?<\/script>/gi, "")
  .replace(/<style[\s\S]*?<\/style>/gi, "")
  .replace(/<svg[\s\S]*?<\/svg>/gi, "");
t = t.replace(/<h([1-6])[^>]*>/gi, (_, n) => "\n\n@@H" + n + "@@ ").replace(/<\/h[1-6]>/gi, "\n");
t = t.replace(/<li[^>]*>/gi, "\n@@LI@@ ").replace(/<br\s*\/?>/gi, "\n");
t = t.replace(/<\/(p|div|tr|ul|ol|table|section)>/gi, "\n");
t = t.replace(/<[^>]+>/g, "");
```

~2.1 MB of HTML collapses to ~65 KB of readable text with heading markers intact. The guide
body starts at the `Build Overview` heading and runs to `Changelog` / `Comments`; the trailing
stats table and table of contents repeat information you already have.

**Not in the HTML:** the PoB import code (rendered client-side, behind a Copy button) and the
per-tier gear/skill tables (tab widgets). You get the tab *labels* and the first tab's contents.
Say so instead of pretending the tiers are complete.

## 3. Deliverable sanity

- The guide is someone's build, not documentation: figures move between leagues. Always name
  the version and the updated-on date you translated.
- Link back to the source and credit the author in the first lines of the output.
