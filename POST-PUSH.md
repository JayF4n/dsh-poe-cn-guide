# push 之后的检查项

前置：`git push -u origin main` 与 `git push origin v1.0.0` 已成功。

---

## 一、GitHub 仓库设置（上架前必须完成）

| 检查项 | 怎么做 | 为什么必须 |
|---|---|---|
| 仓库是 **Public** | Settings → 最下方 Danger Zone | 私有仓库市场读不到 `package.json`，无法判断兼容性 |
| 加 topic **`dsh-plugin`** | 仓库首页右上 ⚙️ → Topics | 目录 PR 会被自动校验这一项，缺失直接打回 |
| 加 topic `deepseek-harness`、`agent-skill`、`path-of-exile`、`translation` | 同上 | 影响市场与站点的可发现性 |
| Description 填好 | 首页 ⚙️ → Description | 市场卡片在缺 description 时回退到仓库描述 |
| **仓库满 1 天** | 等 | 目录规则：新仓库会被拒，满 1 天后可重新提交 |

> 目录明确写了没有 commit 数门槛（「history length measures development habit, not quality」），
> 只有 1 天年龄这一条硬门槛。

---

## 二、打 tag 与发 Release

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub → **Releases → Draft a new release**：

1. **Choose a tag**：`v1.0.0`
2. **Release title**：`v1.0.0`
3. **Describe this release**：粘贴 `.github/release-v1.0.0.md` 全文
4. 不要勾 **Set as a pre-release**（这是稳定版）
5. **Publish release**

### 发布后自检

- [ ] `https://github.com/JayF4n/dsh-poe-cn-guide/releases/tag/v1.0.0` 能打开
- [ ] 页面上的版本号显示为 **1.0.0**（市场用 `/(\d+\.\d+\.\d+)/` 解析 tag，
      `v` 前缀不影响，但 `nightly` 这种会判为「未知」而静默不提示更新）
- [ ] CHANGELOG 里的链接 `.../releases/tag/v1.0.0` 与 `.../compare/v1.0.0...HEAD` 都能点开

---

## 三、发 npm（可选，但与 Release 二选一还是都做要定）

```bash
npm login          # 需要 npm 账号
npm publish --access public
npm view dsh-poe-cn-guide version   # 应输出 1.0.0
```

- [ ] `npm view dsh-poe-cn-guide` 能查到，`repository` 字段指向正确仓库
- [ ] 包内文件数 = 16（`pnpm pack --dry-run` 输出，无 `node_modules`/`test`/`.github`）

> 只发 GitHub 也可以：市场支持 GitHub-only 条目，会读取链接所指包的清单。
> 代价是用户更新要看 Release 版本号，没有 dist-tag 通道。

---

## 四、提交目录 PR

**目标仓库**：<https://github.com/awesome-dsh-plugin/awesome-dsh-plugin>
（不是 `dsh-market/dsh-market`，那个是市场应用本身）

**只提交一个文件**：`data/plugins/JayF4n__dsh-poe-cn-guide.yml`

内容直接用 `.github/market-entry.yml`，去掉开头的注释块即可：

```yaml
url: https://github.com/JayF4n/dsh-poe-cn-guide
name: JayF4n/dsh-poe-cn-guide
category: skill
description:
  en: Translation skill for Path of Exile build guides that turns English league-starter write-ups into Chinese with poedb.tw terminology, shipping a 3,134-term glossary and real gem socket colours.
  zh: 把流放之路英文开荒攻略译成中文的翻译技能，内置 3134 条流亡编年史术语与宝石真实插槽颜色。
```

**不要**手工编辑 README 或 README.zh.md——它们由 `data/plugins/*.yml` 生成，
合并后自动重新生成。手工改会产生冲突。

**分类选择理由**：`skill` 是可用取值之一（`agi ui usage theme model identity session memory tools wsl browser vision voice docs skill workflow git notify dev security remote market fun`）。
本插件通过 DSH 技能系统提供能力，不是 UI 组件、不是模型、不是主题，`skill` 最贴切。

**PR 标题建议**：`Add JayF4n/dsh-poe-cn-guide — Path of Exile guide translation skill`

---

## 五、上架后验证

- [ ] 市场「发现」页搜 `dsh-poe-cn-guide`，卡片出现
- [ ] 兼容标记是**可用**而不是「未知」——未知通常意味着市场读不到 `package.json`
      （仓库私有 / 地址写错 / 网络问题）
- [ ] 换一个 profile 一键安装，重启后 `poe-cn-guide` 出现在技能目录
- [ ] 跑一次 `node <skill resourceBase>/scripts/lookup.mjs 电能释放` 应输出电能释放

---

## 六、后续维护提醒

**宿主升级会静默失效**：`package.json` 的 peer range 是
`^0.2.0-rc.1 || ^0.2.1-rc.3 || ^0.2.2-rc.3`。DSH 一旦发布 0.3.x，这个 range 不再命中，
插件会在市场里被「兼容筛选」隐藏——**没有任何报错**。

建议：在日历上设一个提醒，或在 DSH 发布新版后回来看一眼这个文件。

**赛季切换会过期**：`data/glossary.json` 的 `meta.season` 当前是 `3.30`。
改造宝石每个赛季改名（离心之 / 增幅之 电能释放），跨赛季前必须重跑：

```bash
cd skills/poe-cn-guide
node scripts/build-glossary.mjs --season 3.31
```

然后同步 `SKILL.md` 里的条目数说明，发一个 patch 版本。
