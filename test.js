#!/usr/bin/env node
const {execSync} = require('child_process');
const fs = require('fs');
const path = require('path');

const VAULT = process.argv[2] || '/tmp/vault-test';
const SKILL = __dirname;

const run = (cmd) => {
  try {
    const out = execSync('node vault.js ' + cmd + ' ' + VAULT, {
      cwd: SKILL, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
    });
    return {ok: true, out: out || ''};
  } catch(e) {
    return {ok: false, out: (e.stdout || '') + (e.stderr || '')};
  }
};

const stripAnsi = s => s.replace(/\x1b\[[0-9;]*m/g, '');
const pass = (n) => { console.log('  \u2705 ' + n); return 1; };
const fail = (n, e) => { console.log('  \u274c ' + n + ': ' + e.message); return 0; };

let passed = 0, failed = 0;

console.log('\n========================================');
console.log('  Obsidian Vault - Full TEST');
console.log('========================================\n');
console.log('Vault:', VAULT, '\n');

// Init
run('init');
console.log('  vault initialized\n');

// --- Inbox tests ---
const tests = [
  ['inbox empty', () => {
    const r = run('inbox');
    assert(r.ok && stripAnsi(r.out).includes('empty'));
  }],
  ['inbox add', () => {
    const r = run('inbox add "Test idea one"');
    assert(r.ok && stripAnsi(r.out).includes('Added') || stripAnsi(r.out).includes('inbox'));
  }],
  ['inbox list', () => {
    run('inbox add "Test idea two"');
    const r = run('inbox');
    assert(r.ok && stripAnsi(r.out).includes('Test idea one') && stripAnsi(r.out).includes('Test idea two'));
  }],
  ['inbox done', () => {
    const r = run('inbox done 1 "InboxTestNote"');
    assert(r.ok && stripAnsi(r.out).includes('Created') || stripAnsi(r.out).includes('Appended'));
  }],
  ['inbox delete', () => {
    const r = run('inbox delete 1');
    assert(r.ok && stripAnsi(r.out).includes('Deleted'));
  }],
  ['inbox tag', () => {
    run('inbox add "Tagged item"');
    const r = run('inbox tag 1 idea');
    assert(r.ok && stripAnsi(r.out).includes('Tagged') || stripAnsi(r.out).includes('#idea'));
  }],
  ['inbox index invalid', () => {
    const r = run('inbox done 999 nonexistent');
    assert(!r.ok && stripAnsi(r.out).includes('Invalid'));
  }],
  // --- Orphan tests ---
  ['orphan detect', () => {
    const r = run('orphan');
    assert(r.ok && (stripAnsi(r.out).includes('orphan') || stripAnsi(r.out).includes('No orphan')));
  }],
  // --- Kanban tests ---
  ['kanban view', () => {
    const r = run('kanban');
    assert(r.ok && r.out.includes('Inbox') && r.out.includes('Doing'));
  }],
  ['kanban add', () => {
    run('new "KanbanTestNote"');
    const r = run('kanban add "KanbanTestNote" Inbox');
    assert(r.ok && stripAnsi(r.out).includes('已添加') || stripAnsi(r.out).includes('Added'));
  }],
  ['kanban dedup', () => {
    const r = run('kanban add "KanbanTestNote" Doing');
    assert(!r.ok && stripAnsi(r.out).includes('已在') || stripAnsi(r.out).includes('already'));
  }],
  ['kanban move', () => {
    const r = run('kanban move "KanbanTestNote" Inbox Next');
    assert(r.ok && stripAnsi(r.out).includes('已移动') || stripAnsi(r.out).includes('Moved'));
  }],
  ['kanban invalid col', () => {
    const r = run('kanban move "KanbanTestNote" Next BadCol');
    assert(!r.ok && stripAnsi(r.out).includes('无效列名') || stripAnsi(r.out).includes('Invalid'));
  }],
  ['kanban json format', () => {
    const j = path.join(VAULT, '.obsidian', 'kanban.json');
    assert(fs.existsSync(j));
    const d = JSON.parse(fs.readFileSync(j, 'utf8'));
    assert(d.version === 1 && d.columns !== undefined);
  }],
  ['weekly review', () => {
    const r = run('review weekly');
    assert(r.ok && (r.out.includes('已创建') || r.out.includes('已存在') || r.out.includes('周回顾')));
  }],
  ['monthly review', () => {
    const r = run('review monthly');
    assert(r.ok && (r.out.includes('已创建') || r.out.includes('已存在') || r.out.includes('月回顾')));
  }],
];

const assert = (cond, msg) => { if (!cond) throw new Error(msg || 'assertion failed'); };

for (const [name, fn] of tests) {
  try {
    fn();
    passed += pass(name);
  } catch(e) {
    failed += fail(name, e);
  }
}

console.log('\n========================================');
console.log('  Result: ' + passed + ' passed, ' + failed + ' failed');
console.log('========================================\n');
if (failed > 0) process.exit(1);
