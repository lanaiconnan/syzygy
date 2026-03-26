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
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
const pass = (n) => { console.log('  \u2705 ' + n); return 1; };
const fail = (n, e) => { console.log('  \u274c ' + n + ': ' + e.message); return 0; };

let passed = 0, failed = 0;

console.log('\n========================================');
console.log('  Obsidian Vault - TEST');
console.log('========================================\n');
console.log('Vault:', VAULT, '\n');

run('init');
console.log('  vault initialized\n');

const tests = [
  ['kanban view', () => {
    const r = run('kanban');
    assert(r.ok && r.out.includes('Inbox') && r.out.includes('Doing'));
  }],
  ['kanban add', () => {
    run('new "TestNote"');
    const r = run('kanban add "TestNote" Inbox');
    assert(r.ok && stripAnsi(r.out).includes('已添加'));
  }],
  ['kanban dedup', () => {
    const r = run('kanban add "TestNote" Doing');
    assert(!r.ok && stripAnsi(r.out).includes('已在'));
  }],
  ['kanban move', () => {
    const r = run('kanban move "TestNote" Inbox Next');
    assert(r.ok && stripAnsi(r.out).includes('已移动'));
  }],
  ['kanban invalid col', () => {
    const r = run('kanban move "TestNote" Next BadCol');
    assert(!r.ok && stripAnsi(r.out).includes('无效列名'));
  }],
  ['kanban json format', () => {
    const j = path.join(VAULT, '.obsidian', 'kanban.json');
    assert(fs.existsSync(j), 'kanban.json exists');
    const d = JSON.parse(fs.readFileSync(j, 'utf8'));
    assert(d.version === 1, 'version field present');
    assert(d.columns !== undefined, 'columns field present');
  }],
  ['weekly review', () => {
    const r = run('review weekly');
    assert(r.ok && (r.out.includes('周回顾') || r.out.includes('已创建') || r.out.includes('已存在')));
  }],
  ['monthly review', () => {
    const r = run('review monthly');
    assert(r.ok && (r.out.includes('月回顾') || r.out.includes('已创建') || r.out.includes('已存在')));
  }],
];

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
