#!/usr/bin/env node
/**
 * Obsidian Vault — QClaw Skill
 * 复刻 Obsidian 核心特性的本地知识库
 * 
 * 用法：
 *   node vault.js init [path]        初始化 vault
 *   node vault.js new <name> [path]  新建笔记
 *   node vault.js daily [path]       今日笔记
 *   node vault.js search <word> [path] 搜索
 *   node vault.js tags [path]        列出所有标签
 *   node vault.js backlinks <note> [path] 反向链接
 *   node vault.js graph [path]       文本图谱
 *   node vault.js outline <note> [path] 笔记大纲
 *   node vault.js stat [path]        知识库统计
 */

const fs = require('fs');
const path = require('path');

// ============ 配置 ============

const DEFAULT_VAULT = path.join(process.env.HOME, 'vault');
const OBSIDIAN_DIR = '.obsidian';
const INDEX_FILE = 'index.json';
const NOTES_DIR = 'notes';
const DAILY_DIR = 'daily';

// ============ 工具函数 ============

function log(...args) {
  console.log('[vault]', ...args);
}

function error(...args) {
  console.error('[vault ERROR]', ...args);
}

function readFile(fp) {
  try {
    return fs.readFileSync(fp, 'utf8');
  } catch {
    return null;
  }
}

function writeFile(fp, content) {
  fs.writeFileSync(fp, content, 'utf8');
}

function ensureDir(fp) {
  if (!fs.existsSync(fp)) {
    fs.mkdirSync(fp, { recursive: true });
  }
}

function getVault(root) {
  if (!fs.existsSync(root)) return null;
  return {
    root,
    obsidianDir: path.join(root, OBSIDIAN_DIR),
    notesDir: path.join(root, NOTES_DIR),
    dailyDir: path.join(root, DAILY_DIR),
    indexPath: path.join(root, OBSIDIAN_DIR, INDEX_FILE),
  };
}

function loadIndex(vault) {
  const idx = readFile(vault.indexPath);
  if (idx) {
    try { return JSON.parse(idx); } catch {}
  }
  return { tags: {}, backlinks: {}, notes: {} };
}

function saveIndex(vault, index) {
  ensureDir(vault.obsidianDir);
  writeFile(vault.indexPath, JSON.stringify(index, null, 2));
}

// ============ 双向链接提取 ============

function extractLinks(content) {
  // 匹配 [[笔记名]] 或 [[笔记名|显示名]]
  const regex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  const links = [];
  let m;
  while ((m = regex.exec(content)) !== null) {
    links.push(m[1].trim());
  }
  return [...new Set(links)];
}

function extractTags(content) {
  // 匹配 #标签（排除链接内的）
  const regex = /(?<!\[)\#([a-zA-Z0-9_\-/]+)/g;
  const tags = [];
  let m;
  while ((m = regex.exec(content)) !== null) {
    tags.push(m[1]);
  }
  return [...new Set(tags)];
}

function extractOutline(content) {
  // 提取 # 标题
  const lines = content.split('\n');
  const outline = [];
  for (const line of lines) {
    const m = line.match(/^(#{1,6})\s+(.+)$/);
    if (m) {
      outline.push({
        level: m[1].length,
        text: m[2].trim(),
        line: line,
      });
    }
  }
  return outline;
}

// ============ 索引构建 ============

function buildIndex(vault) {
  const index = { tags: {}, backlinks: {}, notes: {} };
  ensureDir(vault.notesDir);
  ensureDir(vault.dailyDir);

  // 扫描所有 .md 文件
  const scanDir = (dir, subPath = '') => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir)) {
      const fp = path.join(dir, entry);
      const stat = fs.statSync(fp);
      if (stat.isDirectory()) {
        scanDir(fp, subPath ? `${subPath}/${entry}` : entry);
      } else if (entry.endsWith('.md')) {
        const noteName = subPath ? `${subPath}/${entry.replace('.md', '')}` : entry.replace('.md', '');
        processNote(vault.root, fp, noteName, index);
      }
    }
  };

  scanDir(vault.notesDir);
  scanDir(vault.dailyDir);

  saveIndex(vault, index);
  return index;
}

function processNote(vaultRoot, fp, noteName, index) {
  const content = readFile(fp);
  if (!content) return;

  const links = extractLinks(content);
  const tags = extractTags(content);
  const stat = fs.statSync(fp);
  const relPath = path.relative(vaultRoot, fp);

  index.notes[noteName] = {
    path: relPath,
    links: links.length,
    tags,
    modified: stat.mtimeMs,
    size: stat.size,
  };

  // 反向链接索引
  for (const linked of links) {
    if (!index.backlinks[linked]) index.backlinks[linked] = [];
    index.backlinks[linked].push(noteName);
  }

  // 标签索引
  for (const tag of tags) {
    if (!index.tags[tag]) index.tags[tag] = [];
    index.tags[tag].push(noteName);
  }
}

// ============ 命令实现 ============

function cmdInit(vaultPath) {
  const vault = getVault(vaultPath);
  if (vault) {
    log(`Vault 已存在: ${vaultPath}`);
    return;
  }
  ensureDir(vaultPath);
  ensureDir(path.join(vaultPath, OBSIDIAN_DIR));
  ensureDir(path.join(vaultPath, NOTES_DIR));
  ensureDir(path.join(vaultPath, DAILY_DIR));

  // 创建欢迎笔记
  const welcome = `---
created: ${new Date().toISOString()}
---

# 欢迎使用 Obsidian Vault

这是一个本地优先的知识库，灵感来自 Obsidian。

## 快速开始

- 用 \`vault new <名称>\` 创建笔记
- 用 \`vault daily\` 写日记
- 用 \`[[双向链接]]\` 连接笔记
- 用 \`#标签\` 标记内容

## 核心特性

- **双向链接** — [[欢迎使用 Obsidian Vault]]
- **标签** — #入门 #欢迎
- **每日笔记** — 自动按日期归档
- **本地存储** — Markdown 格式，永不锁定

---

> 你的想法属于你。Vault 就是你的第二大脑。
`;
  writeFile(path.join(vaultPath, NOTES_DIR, '欢迎.md'), welcome);
  buildIndex(getVault(vaultPath));
  log(`✅ Vault 初始化完成: ${vaultPath}`);
  log(`   笔记目录: ${vaultPath}/${NOTES_DIR}/`);
  log(`   每日笔记: ${vaultPath}/${DAILY_DIR}/`);
}

function cmdNew(noteName, vaultPath) {
  const vault = getVault(vaultPath);
  if (!vault) {
    error(`Vault 不存在: ${vaultPath}`);
    error(`先运行: vault init ${vaultPath}`);
    return 1;
  }

  // 支持嵌套路径，如 "工作/项目A"
  const parts = noteName.split('/');
  const fileName = parts.pop();
  const noteDir = parts.length > 0 ? path.join(vault.notesDir, ...parts) : vault.notesDir;
  ensureDir(noteDir);

  const fp = path.join(noteDir, `${fileName}.md`);
  if (fs.existsSync(fp)) {
    error(`笔记已存在: ${fp}`);
    return 1;
  }

  const today = new Date().toISOString().split('T')[0];
  const content = `---
created: ${new Date().toISOString()}
tags: []
---

# ${fileName}

`;

  writeFile(fp, content);
  buildIndex(vault);
  log(`✅ 笔记已创建: ${fp}`);
  return 0;
}

function cmdDaily(vaultPath) {
  const vault = getVault(vaultPath);
  if (!vault) {
    error(`Vault 不存在: ${vaultPath}`);
    return 1;
  }

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const dayName = today.toLocaleDateString('zh-CN', { weekday: 'long' });
  const fp = path.join(vault.dailyDir, `${dateStr}.md`);

  if (!fs.existsSync(fp)) {
    const content = `---
created: ${today.toISOString()}
type: daily
---

# 📅 ${dateStr} — ${dayName}

## 今日计划


## 记录


## 反思


`;
    writeFile(fp, content);
    buildIndex(vault);
    log(`✅ 今日笔记已创建: ${fp}`);
  } else {
    log(`📝 今日笔记已存在: ${fp}`);
  }

  return 0;
}

function cmdSearch(keyword, vaultPath) {
  const vault = getVault(vaultPath);
  if (!vault) {
    error(`Vault 不存在: ${vaultPath}`);
    return 1;
  }

  const index = loadIndex(vault);
  const results = [];
  const kw = keyword.toLowerCase();

  // 搜索文件名
  for (const [name, info] of Object.entries(index.notes)) {
    if (name.toLowerCase().includes(kw)) {
      results.push({ name, info, match: 'title' });
    }
  }

  // 搜索标签
  for (const [tag, notes] of Object.entries(index.tags)) {
    if (tag.toLowerCase().includes(kw)) {
      for (const note of notes) {
        if (!results.find(r => r.name === note)) {
          const info = index.notes[note];
          results.push({ name: note, info, match: `tag:#${tag}` });
        }
      }
    }
  }

  if (results.length === 0) {
    log(`没有找到包含 "${keyword}" 的笔记`);
    return 0;
  }

  log(`🔍 找到 ${results.length} 条结果:`);
  for (const r of results) {
    const icon = r.match === 'title' ? '📄' : '🏷️';
    const info = r.info;
    log(`  ${icon} ${r.name} (${r.match})`);
    log(`     📁 ${info.path} | 🔗 ${info.links} 个链接 | 🏷️ ${info.tags.join(', ')}`);
  }

  return 0;
}

function cmdTags(vaultPath) {
  const vault = getVault(vaultPath);
  if (!vault) {
    error(`Vault 不存在: ${vaultPath}`);
    return 1;
  }

  const index = loadIndex(vault);
  const tags = Object.entries(index.tags).sort((a, b) => b[1].length - a[1].length);

  if (tags.length === 0) {
    log('还没有任何标签，用 #标签 添加');
    return 0;
  }

  log(`🏷️  共 ${tags.length} 个标签:\n`);
  for (const [tag, notes] of tags) {
    const bar = '█'.repeat(Math.min(notes.length, 20));
    log(`  #${tag.padEnd(20)} ${bar} (${notes.length})`);
    log(`    → ${notes.slice(0, 3).join(', ')}${notes.length > 3 ? ` +${notes.length - 3}` : ''}`);
  }

  return 0;
}

function cmdBacklinks(noteName, vaultPath) {
  const vault = getVault(vaultPath);
  if (!vault) {
    error(`Vault 不存在: ${vaultPath}`);
    return 1;
  }

  const index = loadIndex(vault);

  // 尝试模糊匹配
  const candidates = Object.keys(index.notes).filter(n =>
    n.toLowerCase().includes(noteName.toLowerCase())
  );

  const exact = candidates.find(n => n.toLowerCase() === noteName.toLowerCase());
  const target = exact || (candidates.length > 0 ? candidates[0] : noteName);

  const links = index.backlinks[target] || [];

  if (links.length === 0) {
    log(`📭 没有任何笔记引用 [[${target}]]`);
    return 0;
  }

  log(`🔗 ${links.length} 篇笔记引用 [[${target}]]:\n`);
  for (const note of links) {
    const info = index.notes[note];
    log(`  📄 ${note}`);
    log(`     📁 ${info.path}`);
  }

  return 0;
}

function cmdGraph(vaultPath) {
  const vault = getVault(vaultPath);
  if (!vault) {
    error(`Vault 不存在: ${vaultPath}`);
    return 1;
  }

  const index = loadIndex(vault);
  const notes = Object.keys(index.notes);

  if (notes.length === 0) {
    log('Vault 是空的，先创建一些笔记');
    return 0;
  }

  log(`🕸️  知识图谱 — ${notes.length} 篇笔记\n`);

  // 找出高度链接的笔记（hub）
  const hubs = notes
    .filter(n => (index.notes[n].links || 0) > 0)
    .sort((a, b) => (index.notes[b].links || 0) - (index.notes[a].links || 0))
    .slice(0, 5);

  // 图谱 ASCII 可视化
  log('  核心节点（高度链接）:');
  for (const hub of hubs) {
    const info = index.notes[hub];
    const connections = Object.entries(index.backlinks)
      .filter(([_, v]) => v.includes(hub))
      .map(([k]) => k)
      .filter(n => n !== hub);
    log(`    🔵 ${hub} (${info.links} 链接)`);
    for (const conn of connections.slice(0, 5)) {
      log(`        ↔ ${conn}`);
    }
  }

  log('\n  连接统计:');
  const totalLinks = notes.reduce((sum, n) => sum + (index.notes[n].links || 0), 0);
  const avgLinks = notes.length > 0 ? (totalLinks / notes.length).toFixed(1) : 0;
  log(`    总链接数: ${totalLinks}`);
  log(`    平均链接: ${avgLinks}/篇`);
  log(`    孤立笔记: ${notes.filter(n => index.notes[n].links === 0).length}`);

  return 0;
}

function cmdOutline(noteName, vaultPath) {
  const vault = getVault(vaultPath);
  if (!vault) {
    error(`Vault 不存在: ${vaultPath}`);
    return 1;
  }

  const index = loadIndex(vault);
  const noteInfo = index.notes[noteName];
  if (!noteInfo) {
    error(`找不到笔记: ${noteName}`);
    return 1;
  }

  const fp = path.join(vault.root, noteInfo.path);
  const content = readFile(fp);
  if (!content) {
    error(`无法读取: ${fp}`);
    return 1;
  }

  const outline = extractOutline(content);
  if (outline.length === 0) {
    log(`📋 "${noteName}" 没有标题`);
    return 0;
  }

  log(`📋 "${noteName}" 大纲:\n`);
  for (const item of outline) {
    const indent = '  '.repeat(item.level - 1);
    const icon = item.level === 1 ? '◆' : item.level === 2 ? '◇' : '•';
    log(`  ${indent}${icon} ${item.text}`);
  }

  return 0;
}

// ============ 看板视图 ============

const KANBAN_COLUMNS = ['Inbox', 'Next', 'Doing', 'Done', 'Archive'];
const KANBAN_FILE = 'kanban.json';

function loadKanban(vault) {
  const fp = path.join(vault.obsidianDir, KANBAN_FILE);
  const content = readFile(fp);
  if (!content) return {};
  try {
    const parsed = JSON.parse(content);
    // Fix #6: 解包 {version, columns} 格式
    if (parsed.columns) return parsed.columns;
    return parsed;
  } catch { return {}; }
}

function saveKanban(vault, data) {
  ensureDir(vault.obsidianDir);
  // Fix #6: 加版本号，支持未来升级
  writeFile(path.join(vault.obsidianDir, KANBAN_FILE), JSON.stringify({ version: 1, columns: data }, null, 2));
}

function cmdKanban(vaultPath) {
  const vault = getVault(vaultPath);
  if (!vault) { error(`Vault 不存在: ${vaultPath}`); return 1; }
  const kanban = loadKanban(vault);

  log('🗺️  看板视图 — ' + vaultPath + '\n');

  for (const col of KANBAN_COLUMNS) {
    const items = kanban[col] || [];
    const color = col === 'Inbox' ? '📥' : col === 'Next' ? '📌' : col === 'Doing' ? '🔨' : col === 'Done' ? '✅' : '📦';
    log(`  ${color} ${col} (${items.length})`);
    if (items.length === 0) {
      log(`      —`);
    } else {
      for (const item of items) {
        log(`      • ${item.note}`);
        if (item.tag) log(`        🏷️ #${item.tag}`);
        if (item.due) log(`        📅 ${item.due}`);
      }
    }
    log('');
  }

  log('  用法: vault kanban add <note> <col>    添加笔记到列');
  log('  用法: vault kanban move <note> <from> <to> 移动笔记');
  log('  用法: vault kanban done <note>         移到 Done');
  return 0;
}

function cmdKanbanAdd(noteName, col, vaultPath) {
  const vault = getVault(vaultPath);
  if (!vault) { error(`Vault 不存在: ${vaultPath}`); return 1; }

  const index = loadIndex(vault);
  if (!index.notes[noteName]) {
    error(`笔记不存在: ${noteName}`);
    return 1;
  }
  if (!KANBAN_COLUMNS.includes(col)) {
    error(`无效列名: ${col}，可选: ${KANBAN_COLUMNS.join(', ')}`);
    return 1;
  }

  const kanban = loadKanban(vault);
  // Fix #1: 防止同一笔记重复添加
  for (const c of KANBAN_COLUMNS) {
    if (kanban[c] && kanban[c].findIndex(i => i.note === noteName) >= 0) {
      error(`"${noteName}" 已在 ${c} 列，不能重复添加`);
      return 1;
    }
  }
  if (!kanban[col]) kanban[col] = [];
  kanban[col].push({ note: noteName, added: new Date().toISOString() });
  saveKanban(vault, kanban);

  log(`✅ 已添加 "${noteName}" → ${col}`);
  return 0;
}

function cmdKanbanMove(noteName, fromCol, toCol, vaultPath) {
  const vault = getVault(vaultPath);
  if (!vault) { error(`Vault 不存在: ${vaultPath}`); return 1; }

  // Fix #2: 验证列名合法性
  if (!KANBAN_COLUMNS.includes(fromCol)) { error(`无效列名: ${fromCol}`); return 1; }
  if (!KANBAN_COLUMNS.includes(toCol))   { error(`无效列名: ${toCol}`);   return 1; }

  const kanban = loadKanban(vault);
  const from = kanban[fromCol] || [];
  const idx = from.findIndex(i => i.note === noteName);

  if (idx < 0) {
    error(`"${noteName}" 不在 ${fromCol} 列`);
    return 1;
  }

  const [item] = from.splice(idx, 1);
  if (!kanban[toCol]) kanban[toCol] = [];
  kanban[toCol].push(item);
  saveKanban(vault, kanban);

  log(`✅ 已移动 "${noteName}" ${fromCol} → ${toCol}`);
  return 0;
}

// ============ 周期回顾 ============

function getWeekRange(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 周一
  const monday = new Date(d.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  };
}

function getMonthRange(year, month) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
  return { start, end };
}

function getNotesInRange(vault, start, end) {
  const index = loadIndex(vault);
  const startMs = new Date(start).getTime();
  const endMs = new Date(end + 'T23:59:59').getTime();

  return Object.entries(index.notes)
    .filter(([_, info]) => info.modified >= startMs && info.modified <= endMs)
    .map(([name, info]) => ({ name, ...info }));
}

function buildReview(vault, title, dateRange, type) {
  const { start, end } = dateRange;
  const notes = getNotesInRange(vault, start, end);

  // 统计
  const byTag = {};
  const byDay = {};
  for (const note of notes) {
    for (const tag of note.tags) {
      if (!byTag[tag]) byTag[tag] = 0;
      byTag[tag]++;
    }
    const day = new Date(note.modified).toISOString().split('T')[0];
    byDay[day] = (byDay[day] || 0) + 1;
  }

  const topTags = Object.entries(byTag).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const days = Object.keys(byDay).sort();
  let totalWords = 0;
  for (const note of notes) {
    const fp2 = path.join(vault.root, note.path);
    const c2 = readFile(fp2);
    if (c2) totalWords += c2.replace(/[#*`\[\]]/g, '').length;
  }

  const body = [
    `---`,
    `type: ${type}`,
    `date: ${title}`,
    `created: ${new Date().toISOString()}`,
    `---`,
    ``,
    `# 📊 ${title}`,
    ``,
    `## 📈 概览`,
    ``,
    `| 指标 | 数值 |`,
    `|------|------|`,
    `| 笔记数量 | ${notes.length} |`,
    `| 活跃天数 | ${days.length} |`,
    `| 估算字数 | ~${totalWords} |`,
    ``,
    `## 🏷️ Top 标签`,
    ``,
  ];

  for (const [tag, count] of topTags) {
    body.push(`- #${tag} (${count})`);
  }

  body.push(``);
  body.push(`## 📅 每日记录`);
  body.push(``);
  for (const day of days) {
    const count = byDay[day];
    const emoji = count >= 5 ? '🔥' : count >= 2 ? '✨' : '💤';
    body.push(`${emoji} ${day}: ${count} 篇`);
  }

  body.push(``);
  body.push(`## 📝 本周期笔记`);
  body.push(``);
  for (const note of notes.slice(0, 20)) {
    body.push(`- [[${note.name}]]`);
  }

  body.push(``);
  body.push(`## 🤔 反思`);
  body.push(``);
  body.push(`**本周最大的收获是什么？**`);
  body.push(``);
  body.push(`**有什么需要改进的？**`);
  body.push(``);
  body.push(`**下周的重点是什么？**`);

  return body.join('\n');
}

function cmdReview(period, vaultPath) {
  const vault = getVault(vaultPath);
  if (!vault) { error(`Vault 不存在: ${vaultPath}`); return 1; }

  let title, range, type, fileName;

  if (period === 'weekly' || period === 'week' || period === 'w') {
    const { start, end } = getWeekRange(new Date());
    title = `周回顾 ${start} ~ ${end}`;
    range = { start, end };
    type = 'weekly-review';
    fileName = `weekly-${end}.md`;
  } else if (period === 'monthly' || period === 'month' || period === 'm') {
    const now = new Date();
    const { start, end } = getMonthRange(now.getFullYear(), now.getMonth() + 1);
    title = `${now.getFullYear()}年${now.getMonth() + 1}月回顾`;
    range = { start, end };
    type = 'monthly-review';
    fileName = `monthly-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.md`;
  } else {
    error(`用法: vault review weekly|monthly`);
    error(`示例: vault review weekly`);
    return 1;
  }

  const fp = path.join(vault.notesDir, fileName);
  if (fs.existsSync(fp)) {
    log(`📋 回顾已存在: ${fp}`);
    log(`重新生成请先删除: rm "${fp}"`);
    return 0;
  }

  const content = buildReview(vault, title, range, type);
  writeFile(fp, content);
  buildIndex(vault); // 重建索引，加入回顾笔记

  log(`✅ ${title} 已创建: ${fp}`);
  return 0;
}

function cmdStat(vaultPath) {
  const vault = getVault(vaultPath);
  if (!vault) {
    error(`Vault 不存在: ${vaultPath}`);
    return 1;
  }

  const index = loadIndex(vault);
  const notes = Object.entries(index.notes);
  const tags = Object.keys(index.tags);

  const totalLinks = notes.reduce((sum, [_, v]) => sum + v.links, 0);
  const totalSize = notes.reduce((sum, [_, v]) => sum + v.size, 0);
  const sizeMB = (totalSize / 1024 / 1024).toFixed(2);

  const today = new Date().toISOString().split('T')[0];
  const dailyNotes = fs.readdirSync(vault.dailyDir).filter(f => f.endsWith('.md'));
  const todayNote = dailyNotes.find(f => f.startsWith(today));

  log(`
📊 知识库统计: ${vaultPath}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📄 笔记总数:   ${notes.length}
  🏷️  标签总数:   ${tags.length}
  🔗 链接总数:   ${totalLinks}
  📦 占用空间:   ${sizeMB} MB
  📅 每日笔记:   ${dailyNotes.length} 篇 ${todayNote ? '✅ 今天已写' : '❌ 今天未写'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  return 0;
}


// ============ 主入口 ============

function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const restArgs = args.slice(1);

  // vault path：最后一个以 / 或 ~ 开头的参数
  let vaultPath = process.env.VAULT_PATH || DEFAULT_VAULT;
  let rawNoteArgs = restArgs;
  const lastArg = restArgs[restArgs.length - 1];
  if (lastArg && (lastArg.startsWith('/') || lastArg.startsWith('~'))) {
    vaultPath = lastArg;
    rawNoteArgs = restArgs.slice(0, -1);
  }

  const note  = rawNoteArgs[0];
  const col   = rawNoteArgs[1];
  const toCol = rawNoteArgs[2];

  if (!cmd) {
    console.log(`
🗄️  Obsidian Vault — 本地知识库

用法:
  vault init [path]                          初始化知识库
  vault new <名称> [vault]                 新建笔记
  vault daily [vault]                      今日笔记
  vault search <关键词> [vault]            搜索
  vault tags [vault]                       列出标签
  vault backlinks <笔记> [vault]           查看反向链接
  vault graph [vault]                      知识图谱
  vault outline <笔记> [vault]             笔记大纲
  vault stat [vault]                       统计信息
  vault kanban [vault]                     看板视图
  vault kanban add <笔记> <列> [vault]   添加笔记到列
  vault kanban move <笔记> <从> <到> [vault] 移动笔记
  vault review weekly [vault]              周回顾
  vault review monthly [vault]             月回顾

环境变量: VAULT_PATH   设置默认 vault 路径
`);
    return 0;
  }

  try {
    switch (cmd) {
      case 'init':      return cmdInit(note || vaultPath);
      case 'new':       return cmdNew(note, vaultPath);
      case 'daily':     return cmdDaily(vaultPath);
      case 'search':    return cmdSearch(note, vaultPath);
      case 'tags':      return cmdTags(vaultPath);
      case 'backlinks': return cmdBacklinks(note, vaultPath);
      case 'graph':     return cmdGraph(vaultPath);
      case 'outline':   return cmdOutline(note, vaultPath);
      case 'stat':      return cmdStat(vaultPath);
      case 'kanban': {
        if (rawNoteArgs[0] === 'add')  return cmdKanbanAdd(rawNoteArgs[1], rawNoteArgs[2], vaultPath);
        if (rawNoteArgs[0] === 'move') return cmdKanbanMove(rawNoteArgs[1], rawNoteArgs[2], rawNoteArgs[3], vaultPath);
        return cmdKanban(vaultPath);
      }
      case 'review':    return cmdReview(note || 'weekly', vaultPath);
      case 'index':     { const v = getVault(vaultPath); if (!v) { error('不存在'); return 1; } buildIndex(v); log('✅ 索引已重建'); return 0; }
      default:
        error('未知命令: ' + cmd); error('运行 vault 查看帮助'); return 1;
    }
  } catch (e) {
    error('执行失败: ' + e.message); return 1;
  }
}

process.exit(main());
