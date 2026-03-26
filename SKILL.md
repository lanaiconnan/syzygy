# Obsidian Vault — 个人知识库 Skill

> 用 QClaw 的方式复刻 Obsidian 的核心特性。
> 你的第二大脑，本地优先，永不锁定。

## 功能列表

### 核心功能
1. **vault init** — 初始化知识库
2. **vault new <name>** — 创建笔记（自动 YAML frontmatter）
3. **vault link [[笔记名]]** — 插入双向链接
4. **vault daily** — 打开/创建今日笔记
5. **vault search <关键词>** — 全文搜索
6. **vault tags** — 列出所有标签
7. **vault backlinks <笔记名>** — 查看反向链接
8. **vault graph** — 生成文本图谱
9. **vault outline <笔记名>** — 提取大纲
10. **vault export** — 导出为 HTML/PDF

### Obsidian 兼容
- ✅ `[[双向链接]]` 语法
- ✅ `#标签` 自动索引
- ✅ YAML frontmatter 元数据
- ✅ 纯 Markdown 存储
- ✅ vault 就是一个普通文件夹

## 架构

```
vault/
├── .obsidian/          # 元数据（自动生成）
│   └── index.json      # 标签索引、反向链接索引
├── daily/              # 每日笔记
│   └── 2026-03-26.md
└── notes/              # 普通笔记
    └── 我的想法.md
```

## 依赖

无外部依赖，纯 Node.js 文件操作。

## 使用方式

用户说"新建笔记"、"搜索笔记"、"今日日记"、"查看反向链接"等时触发。
