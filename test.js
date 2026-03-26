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
const pass = (n) => { console.log('  ' + String.fromCodePoint(0x2705) + ' ' + n); return 1; };
const fail = (n, e) => { console.log('  ' + String.fromCodePoint(0x274C) + ' ' + n + ': ' + e.message); return 0; };
const assert = (cond, msg) => { if (!cond) throw new Error(msg || 'fail'); };
let passed = 0, failed = 0;

console.log('\n========================================');
console.log('  Obsidian Vault - P1 TEST');
console.log('========================================\n');
console.log('Vault:', VAULT, '\n');

run('init');
console.log('  vault initialized\n');

const tests = [
  ['inbox add', () => {
    const r = run('inbox add "P1 test item"');
    assert(r.ok, 'command succeeded');
  }],
  ['inbox list', () => {
    const r = run('inbox');
    assert(r.ok && stripAnsi(r.out).includes('P1 test item'));
  }],
  ['inbox done', () => {
    const r = run('inbox done 1 "P1Note"');
    assert(r.ok && (stripAnsi(r.out).includes('Created') || stripAnsi(r.out).includes('Appended')));
  }],
  ['orphan', () => {
    const r = run('orphan');
    assert(r.ok, 'orphan command succeeded');
  }],
  ['streak', () => {
    run('daily');
    const r = run('streak');
    assert(r.ok && (stripAnsi(r.out).includes('streak') || stripAnsi(r.out).includes('Streak') || stripAnsi(r.out).includes('day')));
  }],
  ['health', () => {
    const r = run('health');
    assert(r.ok && (stripAnsi(r.out).includes('Health') || stripAnsi(r.out).includes('/100')));
  }],
  ['goal default', () => {
    const r = run('goal');
    assert(r.ok && (r.out.includes('Goal') || r.out.includes('word')));
  }],
  ['goal set', () => {
    const r = run('goal set 300 2');
    assert(r.ok && (stripAnsi(r.out).includes('Goal') || stripAnsi(r.out).includes('goal')));
  }],
  ['goal updated', () => {
    const r = run('goal');
    assert(r.ok && r.out.includes('300'));
  }],
  ['kanban', () => {
    const r = run('kanban');
    assert(r.ok && r.out.includes('Inbox'));
  }],
  ['weekly review', () => {
    const r = run('review weekly');
    assert(r.ok && (r.out.includes('已创建') || r.out.includes('已存在') || r.out.includes('周回顾')));
  }],
];

for (const [name, fn] of tests) {
  try { fn(); passed += pass(name); }
  catch(e) { failed += fail(name, e); }
}

console.log('\n========================================');
console.log('  Result: ' + passed + ' passed, ' + failed + ' failed');
console.log('========================================\n');
if (failed > 0) process.exit(1);
