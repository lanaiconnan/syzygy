# Syzygy 朔望

> **Your second brain, local-first, never locked in.**
> 你的第二大脑，本地优先，永不锁定。

Syzygy is a personal knowledge base CLI tool inspired by Obsidian. Built with pure Node.js — no dependencies, no vendor lock-in. Your vault is just a folder of Markdown files.

朔望是一个受 Obsidian 启发的个人知识库命令行工具。纯 Node.js 开发，无外部依赖，永不锁定。你的知识库就是一个 Markdown 文件夹。

---

## ✨ Features / 功能亮点

- **`[[Bidirectional Links]]`** — Wiki-style linking with automatic backlink index
- **`#Tags`** — Auto-indexed, searchable, visualized
- **Daily Notes** — Calendar-based, automatic date-organized
- **Kanban Board** — Inbox / Next / Doing / Done / Archive
- **Weekly & Monthly Review** — Auto-generated with stats and templates
- **Inbox** — Quick capture, organize later
- **Orphan Detection** — Find and connect isolated notes
- **Streak Counter** — Daily note streak tracking
- **Health Score** — A-F grade for your knowledge base
- **Writing Goals** — Daily word/note targets
- **Books** — Reading list management
- **Flashcards** — Export to Anki (TSV format)
- **Export HTML** — Beautiful shareable HTML pages
- **ASCII Graph** — Visualize your knowledge network

---

## 🚀 Quick Start / 快速上手

```bash
# Clone or download
git clone https://github.com/lanaiconnan/syzygy.git
cd syzygy

# Install (anywhere in PATH)
chmod +x vault.js
cp vault.js /usr/local/bin/sz

# Initialize your vault
sz init ~/syzygy
export VAULT_PATH=~/syzygy      # Optional: set default vault

# Daily workflow
sz daily                        # Open/create today's note
sz inbox add "Random thought"   # Quick capture
sz health                       # Check your KB health
sz inbox done 1                 # Organize item #1 into a note
```

---

## 📖 Full Command Reference / 完整命令参考

### Core / 核心

| Command | Description | 说明 |
|---------|-------------|------|
| `sz init [path]` | Initialize a new vault | 初始化知识库 |
| `sz new <name> [vault]` | Create a new note | 新建笔记 |
| `sz daily [vault]` | Open/create today's daily note | 今日日记 |
| `sz search <word> [vault]` | Full-text search | 全文搜索 |
| `sz tags [vault]` | List all tags with frequency | 标签统计 |
| `sz backlinks <note> [vault]` | Who links to this note? | 反向链接 |
| `sz graph [vault]` | ASCII knowledge graph | 文本知识图谱 |
| `sz outline <note> [vault]` | Extract headings | 笔记大纲 |
| `sz stat [vault]` | Vault statistics | 知识库统计 |

### Kanban / 看板

| Command | Description | 说明 |
|---------|-------------|------|
| `sz kanban [vault]` | View kanban board | 看板视图 |
| `sz kanban add <note> <col> [vault]` | Add note to column | 添加笔记到列 |
| `sz kanban move <note> <from> <to> [vault]` | Move note between columns | 移动笔记 |

### Review / 周期回顾

| Command | Description | 说明 |
|---------|-------------|------|
| `sz review weekly [vault]` | Weekly review (auto-generates) | 周回顾 |
| `sz review monthly [vault]` | Monthly review (auto-generates) | 月回顾 |

### Inbox / 收集箱

| Command | Description | 说明 |
|---------|-------------|------|
| `sz inbox [vault]` | View inbox | 查看收集箱 |
| `sz inbox add <content> [vault]` | Quick capture | 快速随手记 |
| `sz inbox done <N> [note] [vault]` | Organize item into note | 整理到笔记 |
| `sz inbox delete <N> [vault]` | Delete item | 删除 |
| `sz inbox tag <N> <tag> [vault]` | Tag item | 标记 |

### Productivity / 效率

| Command | Description | 说明 |
|---------|-------------|------|
| `sz orphan [vault]` | Detect orphan notes (no links) | 孤立笔记检测 |
| `sz streak [vault]` | Daily note streak counter | 连续打卡天数 |
| `sz health [vault]` | Knowledge base health score | 知识库健康分 |
| `sz goal [vault]` | Today's writing goal progress | 写作目标进度 |
| `sz goal set <words> <notes> [vault]` | Set daily writing goal | 设置写作目标 |

### Export / 导出

| Command | Description | 说明 |
|---------|-------------|------|
| `sz export html <note> [vault]` | Export Markdown → HTML | 导出为 HTML |
| `sz books [vault]` | Reading list | 阅读清单 |
| `sz books add <title> <author> [status] [vault]` | Add book | 添加书籍 |
| `sz books update <N> <status> [vault]` | Update status | 更新状态 |
| `sz books delete <N> [vault]` | Delete book | 删除书籍 |
| `sz flashcard <note> [vault]` | Extract Anki flashcards (TSV) | 生成 Anki 闪卡 |

---

## 🗂️ Vault Structure / 知识库结构

```
vault/
├── .obsidian/              # Metadata (auto-generated)
│   ├── index.json          # Note index (tags, links, timestamps)
│   ├── kanban.json         # Kanban state
│   ├── inbox.json          # Inbox items
│   ├── goals.json          # Writing goals
│   └── books.json          # Reading list
├── daily/                  # Daily notes (auto-organized by date)
│   └── 2026-03-26.md
└── notes/                  # Regular notes
    ├── Welcome.md
    ├── weekly-2026-03-29.md
    └── monthly-2026-03.md
```

All data is plain Markdown — you own it forever. Open any `.md` file in any editor.

---

## 🔧 Configuration / 配置

Set a default vault so you don't need to specify the path every time:

```bash
# Add to ~/.zshrc (macOS) or ~/.bashrc (Linux)
export VAULT_PATH=~/syzygy

# Now you can run commands without specifying the vault
sz daily
sz health
```

Or create a short alias:

```bash
echo 'alias sz="/usr/local/bin/sz"' >> ~/.zshrc
source ~/.zshrc
```

---

## 💡 Obsidian Compatibility / Obsidian 兼容性

Syzygy uses the same conventions as Obsidian, so you can use it alongside any Obsidian client:

- **`[[Wiki Links]]`** — `[[Note Name]]` or `[[Note Name|Display Text]]`
- **`#Tags`** — Auto-indexed, searchable
- **YAML Frontmatter** — Auto-generated on note creation
- **Daily Notes** — Standard `YYYY-MM-DD.md` format
- **Pure Markdown** — Open in Obsidian, VS Code, or any editor

---

## 🔬 Technical Details / 技术细节

- **Language**: Node.js (pure JavaScript)
- **Dependencies**: None (zero npm packages)
- **Storage**: Local filesystem (Markdown + JSON)
- **Compatibility**: macOS, Linux, Windows (Node.js)

---

## 📊 Syzygy vs Obsidian / 与 Obsidian 对比

| Feature | Obsidian | Syzygy |
|---------|----------|---------|
| GUI | ✅ | ❌ CLI only |
| Cross-device sync | Paid sync service | Any cloud (Dropbox/iCloud/Nextcloud) |
| Plugins | 5000+ | Built-in essentials |
| Local-first | ✅ | ✅ |
| Plain Markdown | ✅ | ✅ |
| Learning curve | Medium | Low |
| Cost | Free / Paid sync | Free forever |

---

## 🤝 Contributing / 贡献

Issues and PRs welcome! https://github.com/lanaiconnan/syzygy

---

## 📄 License / 许可证

MIT — Use it, modify it, share it.

---

*Built with 🦞 by [QClaw](https://github.com/lanaiconnan)*
