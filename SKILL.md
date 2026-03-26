# Obsidian Vault — 个人知识库 Skill

> 用 QClaw 的方式复刻 Obsidian 的核心特性。
> 你的第二大脑，本地优先，永不锁定。

## 快速开始

```bash
# 安装（把 vault.js 放到 PATH）
vault init ~/my-vault           # 初始化知识库
vault daily                    # 写今日日记
vault new "我的想法"            # 新建笔记
vault inbox add "随手记一个想法" # 快速收集
vault help                     # 查看全部命令
```

## 功能列表（18 个命令）

### 核心功能
| 命令 | 说明 |
|------|------|
| `vault init [path]` | 初始化知识库 |
| `vault new <名称> [vault]` | 新建笔记（自动 YAML frontmatter）|
| `vault daily [vault]` | 打开/创建今日笔记 |
| `vault search <关键词> [vault]` | 全文搜索 |
| `vault tags [vault]` | 列出所有标签（含使用频率柱状图）|
| `vault backlinks <笔记> [vault]` | 查看反向链接（谁引用了这篇）|
| `vault graph [vault]` | 文本知识图谱（ASCII 可视化）|
| `vault outline <笔记> [vault]` | 提取笔记大纲（`#` 标题树）|
| `vault stat [vault]` | 知识库统计（笔记数/标签/链接/占用空间）|

### 看板视图
| 命令 | 说明 |
|------|------|
| `vault kanban [vault]` | 看板视图（Inbox / Next / Doing / Done / Archive）|
| `vault kanban add <笔记> <列> [vault]` | 添加笔记到列 |
| `vault kanban move <笔记> <从> <到> [vault]` | 移动笔记到另一列 |

### 周期回顾
| 命令 | 说明 |
|------|------|
| `vault review weekly [vault]` | 自动生成周回顾（统计+模板）|
| `vault review monthly [vault]` | 自动生成月回顾（统计+模板）|

### P0 — 核心价值
| 命令 | 说明 |
|------|------|
| `vault inbox [vault]` | 收集箱查看 |
| `vault inbox add <内容> [vault]` | 快速随手记，收集到 Inbox |
| `vault inbox done <N> [笔记名] [vault]` | 把第 N 条整理到笔记（自动创建或追加）|
| `vault inbox delete <N> [vault]` | 删除第 N 条 |
| `vault inbox tag <N> <标签> [vault]` | 标记第 N 条 |
| `vault orphan [vault]` | 孤立笔记检测（没有任何链接的笔记）|

### P1 — 高价值
| 命令 | 说明 |
|------|------|
| `vault streak [vault]` | 连续打卡天数（基于每日笔记）|
| `vault health [vault]` | 知识库健康分（A-F 评分，100分制）|
| `vault goal [vault]` | 今日写作目标进度 |
| `vault goal set <字数> <篇数> [vault]` | 设置每日写作目标 |

### P2 — 锦上添花
| 命令 | 说明 |
|------|------|
| `vault export html <笔记> [vault]` | 把 Markdown 导出为 HTML |
| `vault books [vault]` | 阅读清单管理 |
| `vault books add <书名> <作者> [状态] [vault]` | 添加书籍（状态：to-read / reading / done）|
| `vault books update <N> <状态> [vault]` | 更新书籍状态 |
| `vault books delete <N> [vault]` | 删除书籍 |
| `vault flashcard <笔记> [vault]` | 从笔记提取 Anki 闪卡（TSV 格式）|

## Obsidian 兼容

- `[[双向链接]]` 语法 — 自动解析
- `#标签` 自动索引
- YAML frontmatter — 自动生成 `created` / `tags`
- 纯 Markdown 存储 — vault 就是一个文件夹
- 每日笔记按日期归档

## 架构

```
vault/
├── .obsidian/              # 元数据（自动生成）
│   ├── index.json          # 笔记索引（标签/链接/修改时间）
│   ├── kanban.json         # 看板状态 {version, columns}
│   ├── inbox.json          # Inbox 收集箱
│   ├── goals.json          # 写作目标
│   └── books.json          # 阅读清单
├── daily/                  # 每日笔记
│   └── 2026-03-26.md
└── notes/                  # 普通笔记
    ├── 欢迎.md
    ├── weekly-2026-03-29.md   # 周回顾
    └── monthly-2026-03.md     # 月回顾
```

## 存储格式

所有 `.obsidian/` 下的 JSON 文件都使用 `{ version: 1, ... }` 格式，支持未来升级。

## 环境变量

```bash
export VAULT_PATH=~/my-vault   # 设置默认 vault 路径
vault daily                    # 不用每次指定路径
```

## 依赖

纯 Node.js（无外部 npm 包），任何 Node.js 环境均可运行。

## 开发记录

| 功能集 | 完成时间 | Commit |
|--------|---------|--------|
| 核心功能 + 看板 + 周期回顾 | 2026-03-26 | `61585da` |
| Inbox + 孤立笔记检测 | 2026-03-26 | `1349a1e` |
| 打卡天数 + 健康分 + 写作目标 | 2026-03-26 | `23aaf73` |
| Export HTML + 阅读清单 + 闪卡 | 2026-03-26 | `ff119af` |
