# Delivering the guide as Excel, with gem-coloured text

Goal: a workbook a player can keep open while levelling, where every gem name is coloured by
its real socket colour and gear/passives have their own colours.

Palette taken from a real Chinese PoE guide sheet — reuse it so tabs look consistent:

| Meaning | Colour |
|---|---|
| 红 gem | `#A52835` |
| 绿 gem | `#357320` |
| 蓝 gem | `#245594` |
| 白/灰 gem (exceptional) | `#626A76` |
| 装备 unique | `#894409` |
| 天赋 / 升华 | `#683D90` |
| 灵体 | `#176961` |
| 正文 | `#26221F` |
| 标题 | `#623C2D` (17pt, bottom border `#99715E`) |
| 分节条底 | `#EAE1D2` |
| 隔行底 | `#F7F4EE` |
| 链接 | `#215A70` + underline |

Body font 微软雅黑 11pt; regex columns `Consolas`.

## Per-cell colouring

Each gem cell is its own `ICellData` with a full style — `{ v, t: 1, s }` where `s.cl.rgb` is the
gem colour and `s.bl = 1`. Build the style explicitly per cell; do not clone a template cell's
style and patch the colour, because `setValues` merges rather than replaces cell data and a
stale `bg` or `bd` from the template leaks in.

```js
function st(color, opt = {}) {
  const s = { ff: "Microsoft YaHei", fs: 11, bl: opt.bl ? 1 : 0, cl: { rgb: color },
              vt: 2, tb: 3, tr: {}, n: { pattern: "General" } };
  if (opt.bg) s.bg = { rgb: opt.bg };
  if (opt.ht !== undefined) s.ht = opt.ht;
  return s;
}
```

## Legend with several colours in one cell

A legend like "技能宝石：红 / 绿 / 蓝 / 白（灰） · 装备 · 天赋 / 升华" needs rich text, not cell style:

```js
const rich = api.newRichText();
rich.insertText(text);
rich.setStyle(start, end, { bl: 1, it: 1, cl: { rgb: color }, fs: 11, ff: "Microsoft YaHei" });
sheet.getRange(row - 1, col - 1, 1, 1).setRichTextValueForCell(rich);
```

`setStyle(start, end)` is a half-open character range — compute offsets from the string you
just inserted, and keep them in a table next to the text so they cannot drift.

## Column widths and row heights

- Set widths in pixels: `sheet.setColumnWidth(i, w)`. A 900 px single-column sheet is the
  simplest way to hold prose.
- Nothing auto-fits. Estimate height per row from the longest cell:
  `Math.max(28, ceil(len / floor(width / 12)) * 18 + 10)`, then `setRowHeight`.
- Set row height for *every* row you wrote, including headers (26–30) and the title band (44).

## Univer traps that cost real time

1. **`unmerge()` does not exist.** Use `range.breakApart()`.
2. **`setValues` merges cell data** — `{}` will not clear an old value. `clearContent()` the region
   first whenever you rewrite a sheet.
3. **`univer_import` only accepts paths inside the session workspace.** Copy the template in with
   the file API first; do not point it at the original user path.
4. **A sheet created through `workbook.create()` starts at 20 columns**, so a
   `getRange(0, 0, 150, 26)` reset throws "out of bounds". Clamp to the sheet's own limits.
5. **Merged cells block later merges.** Break the band apart, write all cells, then merge —
   and re-merging a range that still holds any merge throws "ranges to be merged overlap".
6. **Export must be recalculated first** if you wrote formulas; cached values are what xlsx stores.
7. Read back with `getCellDatas()` / `getDisplayValues()` and check both text and `s.cl.rgb`;
   a screenshot confirms layout but not the colour of each run.

## Sheet layout that worked

总览 (legend + PoB links + pantheon + ascendancy + endgame stats) · 地图正则 · 关键要点 ·
剧情流程 · 剧情宝石 (the coloured table) · 装备进阶 · 装备制作 · 灵体与幻化守卫 ·
常见问题 · 术语对照. One idea per tab; the gem table is the only one that needs five columns.
