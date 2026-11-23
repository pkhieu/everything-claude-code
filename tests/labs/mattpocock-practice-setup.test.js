/**
 * Tests for labs/mattpocock-skills-practice/setup-practice-repo.js
 *
 * Builds the practice repo in a temp dir and checks the planted problems are present,
 * so the exercises and ANSWER-KEY.md stay valid.
 *
 * Run with: node tests/labs/mattpocock-practice-setup.test.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', '..', 'labs', 'mattpocock-skills-practice', 'setup-practice-repo.js');

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${err.message}`);
    return false;
  }
}

function runTests() {
  console.log('\n=== Testing mattpocock practice repo setup ===\n');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp-practice-'));
  const repo = path.join(tmp, 'repo');
  const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  let passed = 0;
  let failed = 0;

  const cases = [
    ['setup succeeds', () => {
      const run = spawnSync('node', [SCRIPT, repo], { encoding: 'utf8' });
      assert.strictEqual(run.status, 0, run.stderr);
    }],
    ['creates expected branches', () => {
      const branches = git('branch', '--format=%(refname:short)').split('\n').filter(Boolean).sort();
      assert.deepStrictEqual(branches, ['conflict/per-plant-thresholds', 'conflict/raise-thresholds', 'feature/severity-filter', 'main']);
    }],
    ['baseline test suite passes', () => {
      const run = spawnSync('node', ['--test'], { cwd: repo, encoding: 'utf8' });
      assert.strictEqual(run.status, 0, run.stdout + run.stderr);
    }],
    ['planted bugs are present (clusters merged, firing duration 0)', () => {
      const { buildDigest } = require(path.join(repo, 'src', 'parse-alerts.js'));
      const payload = JSON.parse(fs.readFileSync(path.join(repo, 'fixtures', 'alerts-multi-cluster.json'), 'utf8'));
      const digest = buildDigest(payload, new Date('2026-11-20T10:00:00Z'));
      const notReady = digest.filter((d) => d.alertname === 'KubeNodeNotReady');
      assert.strictEqual(notReady.length, 1);
      assert.strictEqual(notReady[0].count, 2);
      assert.strictEqual(notReady[0].maxDurationMin, 0);
    }],
    ['conflict branches really conflict', () => {
      git('checkout', '-q', '-b', 'tmp-merge', 'main');
      git('-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'merge', '-q', 'conflict/raise-thresholds');
      const run = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'merge', 'conflict/per-plant-thresholds'], { cwd: repo, encoding: 'utf8' });
      assert.notStrictEqual(run.status, 0);
      git('merge', '--abort');
      git('checkout', '-q', 'main');
    }],
    ['refuses a non-empty target', () => {
      const run = spawnSync('node', [SCRIPT, repo], { encoding: 'utf8' });
      assert.strictEqual(run.status, 1);
    }],
  ];

  for (const [name, fn] of cases) {
    if (test(name, fn)) passed++;
    else failed++;
  }

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\nResults: Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
