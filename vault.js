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
  const [, , cmd, arg1, arg2] = process.argv;

  // 命令格式：
  //   vault init [path]
  //   vault new <note> [vault]
  //   vault daily [vault]
  //   vault search <word> [vault]
  //   vault tags [vault]
  //   vault backlinks <note> [vault]
  //   vault graph [vault]
  //   vault outline <note> [vault]
  //   vault stat [vault]
  //
  // 有 arg2 → arg2 是 vault path，arg1 是 note/keyword
  // 无 arg2 → vault 用默认值，arg1 是 note/keyword

  const vaultPath = arg2 || (arg1 && (arg1.startsWith('/') || arg1.startsWith('~')) ? arg1 : process.env.VAULT_PATH || DEFAULT_VAULT);
  const note = (arg2 && arg1) ? arg1 : (arg1 && !arg1.startsWith('/') && !arg1.startsWith('~') ? arg1 : undefined);

  if (!cmd) {
    console.log(`
🗄️  Obsidian Vault — 本地知识库

用法:
  vault init [path]              初始化知识库
  vault new <名称> [path]       新建笔记
  vault daily [path]            今日笔记
  vault search <关键词> [path]  搜索
  vault tags [path]             列出标签
  vault backlinks <笔记> [path] 查看反向链接
  vault graph [path]            知识图谱
  vault outline <笔记> [path]   笔记大纲
  vault stat [path]             统计信息

环境变量:
  VAULT_PATH   设置默认 vault 路径
`);
    return 0;
  }

  try {
    switch (cmd) {
      case 'init':      return cmdInit(arg1 || vaultPath);
      case 'new':       return cmdNew(note, vaultPath);
      case 'daily':     return cmdDaily(vaultPath);
      case 'search':    return cmdSearch(note, vaultPath);
      case 'tags':      return cmdTags(vaultPath);
      case 'backlinks': return cmdBacklinks(note, vaultPath);
      case 'graph':     return cmdGraph(vaultPath);
      case 'outline':   return cmdOutline(note, vaultPath);
      case 'stat':      return cmdStat(vaultPath);
      case 'index':     { const v = getVault(vaultPath); if (!v) { error('不存在'); return 1; } buildIndex(v); log('✅ 索引已重建'); return 0; }
      default:
        error(`未知命令: ${cmd}`);
        error(`运行 vault 查看帮助`);
        return 1;
    }
  } catch (e) {
    error(`执行失败: ${e.message}`);
    return 1;
  }
}

process.exit(main());
