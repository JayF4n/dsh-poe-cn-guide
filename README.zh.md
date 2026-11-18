# dsh-poe-cn-guide

[English](README.md) | 中文

一个 DeepSeek Harness 插件，随包提供 **poe-cn-guide** 技能：用
[流亡编年史（poedb.tw/cn）](https://poedb.tw/cn/) 的术语把流放之路（Path of Exile）的
构筑攻略译成中文，并能导出成**每个宝石名都按真实插槽颜色着色**的 Excel。

安装本包后，技能在**所有工作区**都可用——因为它注册的是自己的技能 provider，
而不是依赖某个被扫描的目录。

## 目录结构

```
dsh-poe-cn-guide/
├─ lib/index.js                  # 技能 provider（list/get），rank 600
├─ cordis.patch.yml              # bundle 层：挂载 provider
├─ skills/poe-cn-guide/          # 技能载荷
│  ├─ SKILL.md                   # 词典指引、工作流、不可妥协的规则
│  ├─ data/glossary.json         # 3134 条中英术语 + 宝石颜色 + 底材名
│  ├─ data/gem-colors.json       # 817 个宝石 → 红 / 绿 / 蓝 / 白
│  ├─ data/overrides.json        # 6 条人工整理术语，每次构建都重新回验
│  ├─ scripts/lookup.mjs         # 离线中英查询
│  ├─ scripts/build-glossary.mjs # 从 poedb.tw 重建 data/
│  └─ references/                # 抓取配方、Excel 上色笔记
└─ test/smoke.mjs                # provider 与打包数据的断言测试
```

## 能力速览

| | |
|---|---|
| **3134** | 条中英术语：技能、辅助、改造宝石、传奇、显著天赋、基石，外加灵体、Boss、赛季机制 |
| **817** | 个宝石的真实插槽颜色——红 / 绿 / 蓝 / 白 |
| **2** | 个脚本：离线查询，以及一个拒绝写半份数据的 poedb 重建脚本 |
| **6** | 条「不许猜」的硬规则（见 SKILL.md 的 Non-negotiables） |

## 安装

### 本地目录（开发 / 自用）

```bash
cd dsh-poe-cn-guide && pnpm install --config.node-linker=hoisted && pnpm test
```

把包放到 profile 解析插件的位置，例如
`~/.dsh/profiles/<profile>/node_modules/dsh-poe-cn-guide`，然后在该 profile 的
`cordis.patch.yml` 追加：

```yaml
- insert:
    - id: poe-cn-guide
      name: 'dsh-poe-cn-guide'
```

重启应用，让 profile bundle 重新加载。

### 从 GitHub 直装

无需发 npm、也无需上架市场。`dsh plugin add` 接受 git 地址，仓库本身就是安装源：

```bash
dsh plugin --profile desktop add github:JayF4n/dsh-poe-cn-guide
# 或钉住 tag，保证可重复安装：
dsh plugin --profile desktop add github:JayF4n/dsh-poe-cn-guide#v1.0.0
```

安装器会解析并钉住所指 commit，然后从 `codeload.github.com` 下载 tarball——
**不是** `git clone`。与 registry 安装的两点差异：更新要跟 Release/tag 走
（没有 dist-tag 通道），且没有 `npm view` 式的安装前查询。

### 插件市场

上架后可在插件市场面板一键安装。`dshmarket` 会读 `package.json` 里的
`dsh.bundle.patch`，自动挂载 `cordis.patch.yml`。

## 验证

```bash
pnpm install --config.node-linker=hoisted   # 原因见下方「依赖」一节
node test/smoke.mjs
# {"ok":true,"entry":"poe-cn-guide","entries":3134,"gems":817,"warnings":1}
```

测试用一个假的 `ctx.skills` 驱动 `lib/index.js`：先断言目录条目与它的 `resourceBase`，
再加载技能正文，然后**通过那个 `resourceBase`** 去读 `data/glossary.json`——
以此证明数据确实随包走，而不是恰好磁盘上能访问到。测试同时覆盖失败路径：
`assetRoot` 不存在时应降级成「空但完整」的目录并触发一次 invalidate，而不是抛异常。

## 安装之后

```bash
cd <技能 resourceBase>          # 目录条目里会打印这个路径
node scripts/lookup.mjs 电能释放
node scripts/build-glossary.mjs --season 3.31   # 刷新词典
```

## 依赖

| 包 | 类型 | 作用 |
|---|---|---|
| `yaml` | dependency | 解析 SKILL.md 的 frontmatter |
| `@deepseek-ai/schemastery` | peer | loader 校验用的 `Config` schema，由宿主提供 |
| `@deepseek-ai/dsh-skill` | peer（可选） | 技能注册表类型；运行时并不 import |

运行时 peer 只声明不打包：DSH profile 本来就带着它们，而同一个 Cordis 插件包在进程里
出现两份，是制造「两个 registry」的经典方式。

### 本地开发必须用 hoisted 安装

pnpm 默认的隔离 store 会把 `schemastery` 自己的依赖（`@deepseek-ai/cosmokit`、
`@standard-schema/spec`）放在包在运行时解析不到的位置，导致 `node test/smoke.mjs` 报
`ERR_MODULE_NOT_FOUND`。用 hoisted 安装——它也正好贴近 profile 在生产环境提供的形态：

```bash
pnpm install --config.node-linker=hoisted
```

（提交一个 `.npmrc` 能达到同样效果，但这类文件常被安全策略拦截，因为里面可能带
registry token。所以把 flag 写在命令行上。）

## 与「裸目录技能」的区别

| | `.dsh/skills` 下的目录 | 本插件 |
|---|---|---|
| 作用范围 | 单个项目（`~/.dsh/skills` 可全局） | 使用该 bundle 的所有工作区 |
| 更新方式 | 复制文件 | 重装包版本 |
| 发现方式 | 文件系统 provider 扫描根目录 | 包自己注册 provider，rank 600 |

两者载荷完全相同，可以共存：文件系统技能占据 rank 100–500，本插件在 600 档兜底，
为那些没有本地副本的工作区补上。

## 为什么「颜色是数据」而不是推断

宝石的插槽颜色无法从名字或属性需求推出来：

- 启迪（辅） Inspiration Support 是**红色**，不是直觉上的蓝色
- 动量（辅）是绿色
- 附加闪电伤害（辅）是蓝色

凭印象猜会错掉将近一半，而 Excel 攻略里颜色一旦错了，这张表就失去了它唯一的用途——
边练级边对色连宝石。

## 数据来源与合规

MIT 协议。中文名取自 poedb.tw/cn；英文名与底材名通过共享 id 从 poedb.tw/us 关联而来。

- 游戏名称与文本版权归 Grinding Gear Games 所有
- 本包与 Grinding Gear Games、poedb.tw 均无隶属或背书关系
- 包内只保留「名称映射」这类事实性数据，不打包 poedb 的整页内容

poedb 是非官方社区站。**如果它改了版式，`build-glossary.mjs` 会中止而不是写出半份词典**
——在这个场景里，一个过期的答案是比没有答案更糟的东西。

词典带赛季戳（`meta.season`，当前为 `3.30`）。改造宝石每个赛季改名，跨赛季前请重跑构建。

## 相关文件

- [CHANGELOG.md](CHANGELOG.md) —— 版本变更记录
- [PUBLISH.md](PUBLISH.md) —— 发布流程（npm / GitHub Release / 市场目录）
- [skills/poe-cn-guide/SKILL.md](skills/poe-cn-guide/SKILL.md) —— 技能本体说明
