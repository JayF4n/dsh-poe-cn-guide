# 发布清单（dsh-poe-cn-guide）

本文件记录**实测过**的发布路径。凡是没验证过的步骤，下面都会明确标注。

## 一、市场是怎么找到你的插件的

关键事实（读自 `dshmarket` 源码与 README）：

> **dshmarket 仓库不是插件目录。** 市场里的列表来自精选仓库
> [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)，
> 在该仓库提 PR（加一条条目）即可上架，站点与市场会自动收录，通常一天内生效。

也就是说，发布 = **两条腿**：

1. 把包发到 npm（或只发 GitHub Release）
2. 去 `awesome-dsh-plugin` 提 PR，让目录知道它存在

## 二、发 npm 之前先自检

### 1. 名字没被占用

```bash
npm view dsh-poe-cn-guide version
# 404 = 可用（本次实测为 404）
```

### 2. 打包内容正确

```bash
pnpm pack --dry-run
```

本次实测输出正好 14 个文件，`node_modules/`、`test/`、`.gitignore` 都不在其中（由 `files` 字段控制）：

```
cordis.patch.yml   lib/index.js   LICENSE   package.json   README.md
skills/poe-cn-guide/{SKILL.md, README.md, data/*.json, scripts/*.mjs, references/*.md}
```

### 3. 干净环境能跑

```bash
rm -rf node_modules && pnpm install --config.node-linker=hoisted && node test/smoke.mjs
# {"ok":true,"entry":"poe-cn-guide","entries":3134,"gems":817,"warnings":1}
```

## 三、宿主兼容性声明

市场会读两类声明来决定「这个插件在当前宿主上装不装得了」：

| 声明 | 位置 | 本包取值 |
|---|---|---|
| 宿主版本门槛 | `engines.dsh`（或 `dsh.engines.dsh`） | 未声明 |
| 核心包版本 | `peerDependencies` 里 `@deepseek-ai/*` 的 range | schemastery `^3.18.1`、dsh-skill 多段 range |

当前宿主是 `0.2.2-rc.3`。本包的 peer range 覆盖 `0.2.0-rc.1`、`0.2.1-rc.3`、`0.2.2-rc.3`，
即已发布的三个 0.2.x 版本线；`dsh-skill` 额外标了 `optional: true`，因为它只用于类型、运行时并不 import。

> 若以后宿主升到 0.3，请同步扩写这个 range，否则市场会在「兼容筛选」里把你的插件隐藏掉。

## 四、发布

```bash
cd dsh-poe-cn-guide
npm publish --access public
```

首次发布前确认 `package.json` 的 `name` / `version` / `license` / `repository` 齐全。
`repository` 目前缺失——上架前补上，否则市场卡片没有源码入口。

### 只发 GitHub（不占 npm 名额）

市场同样支持「仅 GitHub 发布」的条目：读取链接所指包的清单，支持子目录，Release 下载会读对应标签。
适合不想维护 npm 包的情况，但用户更新要靠 Release 版本号。

## 五、上架

去 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 提 PR，加一条条目指向 npm 包名（或 GitHub 仓库）。

- **不要**往 `dsh-market/dsh-market` 提插件条目，那个仓库是市场应用本身
- 收录 ≠ 背书：插件是第三方代码，条目里请写清用途与数据来源

## 六、发布后验证

1. 在市场的「发现」页搜 `dsh-poe-cn-guide`，确认兼容标记是「可用」而非「未知」
2. 在另一个 profile 里一键安装，重启后确认 `poe-cn-guide` 出现在技能目录
3. 跑一次 `node <skill resourceBase>/scripts/lookup.mjs 电能释放`

## 七、更新流程

```bash
# 1. 升级版本号（语义化：修数据 = patch，改行为 = minor）
npm version patch
# 2. 重跑测试
node test/smoke.mjs
# 3. 发布
npm publish
```

字典随赛季刷新时（`node scripts/build-glossary.mjs --season 3.31`），
记得同步 `SKILL.md` 里的条目数与 `meta.season`，再发 patch 版本。

## 八、GitHub Release（本仓库已就绪）

仓库：<https://github.com/JayF4n/dsh-poe-cn-guide>

首次发布会用到的东西都已生成：

| 文件 | 用途 |
|---|---|
| `CHANGELOG.md` | Keep a Changelog 格式，含 `[Unreleased]` 与 `[1.0.0]` 两节 |
| `.github/release-v1.0.0.md` | 直接粘贴进 Release 描述框的正文 |

步骤：

```bash
git tag v1.0.0
git push origin v1.0.0
```

然后在 GitHub 上 **Draft a new release** → 选 `v1.0.0` → 标题填 `v1.0.0`
→ 正文粘贴 `.github/release-v1.0.0.md` 的内容 → Publish。

**tag 必须是 `v1.0.0` 这种含语义版本号的形式**——市场用
`/(\d+\.\d+\.\d+)/` 解析版本，`nightly` 之类会被判为「未知」，
既不提示更新也不报错，属于静默失效。

## 九、合规提醒

- 术语数据来自 poedb.tw（非官方社区站），游戏名词版权归 Grinding Gear Games
- `LICENSE` 中已写明归属与免责（版权人 `JayF4n`），发布时不要删掉那段
- 不要把 poedb 的页面整页打包进包内，只保留「名称映射」这类事实性数据
