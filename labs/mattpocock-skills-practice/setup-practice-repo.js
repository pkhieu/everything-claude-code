#!/usr/bin/env node
/**
 * Creates a throwaway git repo with planted problems for practising mattpocock-skills.
 *
 * Usage: node setup-practice-repo.js [target-dir]     (default: ~/mp-practice)
 *
 * Contents:
 *   src/parse-alerts.js        alert digest module with two planted bugs (for diagnosing-bugs, tdd)
 *   test/parse-alerts.test.js  passing tests that miss both bugs
 *   CONTRIBUTING.md            coding standards (for code-review, Standards axis)
 *   docs/specs/severity-filter.md  spec (for code-review, Spec axis)
 *   docs/plans/jenkins-to-gitlab-ci.md  plan with gaps (for grilling)
 *   fixtures/alerts-*.json     fictional Alertmanager payloads
 *   branches:
 *     feature/severity-filter  implements the spec with one missing requirement and scope creep
 *     conflict/raise-thresholds, conflict/per-plant-thresholds  conflicting edits (for resolving-merge-conflicts)
 *
 * Refuses to run if the target directory exists and is not empty.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const target = path.resolve(process.argv[2] || path.join(os.homedir(), 'mp-practice'));

function git(...args) {
  return execFileSync('git', args, { cwd: target, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function write(rel, content) {
  const file = path.join(target, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function commit(message) {
  git('add', '-A');
  git('-c', 'user.name=Practice Bot', '-c', 'user.email=practice@example.invalid', 'commit', '-q', '-m', message);
}

const PARSE_ALERTS = `'use strict';

/**
 * Builds a digest from an Alertmanager webhook payload.
 * One digest entry per distinct alert (same alertname on the same cluster).
 */

const ZERO_TIME = '0001-01-01T00:00:00Z';

function alertKey(alert) {
  return alert.labels.alertname;
}

function durationMinutes(alert, now) {
  const start = Date.parse(alert.startsAt);
  const end = alert.endsAt ? Date.parse(alert.endsAt) : now.getTime();
  return Math.round((end - start) / 60000);
}

function buildDigest(payload, now = new Date()) {
  const groups = new Map();
  for (const alert of payload.alerts || []) {
    const key = alertKey(alert);
    const entry = groups.get(key) || {
      alertname: alert.labels.alertname,
      cluster: alert.labels.cluster,
      severity: alert.labels.severity,
      count: 0,
      maxDurationMin: 0,
    };
    entry.count += 1;
    entry.maxDurationMin = Math.max(entry.maxDurationMin, durationMinutes(alert, now));
    groups.set(key, entry);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count);
}

module.exports = { buildDigest, ZERO_TIME };
`;

const TESTS = `'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { buildDigest } = require('../src/parse-alerts');

test('groups repeated alerts', () => {
  const payload = {
    alerts: [
      { labels: { alertname: 'DiskFull', cluster: 'prod-01', severity: 'warning' }, startsAt: '2026-11-20T10:00:00Z', endsAt: '2026-11-20T10:30:00Z' },
      { labels: { alertname: 'DiskFull', cluster: 'prod-01', severity: 'warning' }, startsAt: '2026-11-20T11:00:00Z', endsAt: '2026-11-20T11:10:00Z' },
    ],
  };
  const digest = buildDigest(payload);
  assert.strictEqual(digest.length, 1);
  assert.strictEqual(digest[0].count, 2);
  assert.strictEqual(digest[0].maxDurationMin, 30);
});
`;

const FIXTURE_MULTI_CLUSTER = {
  status: 'firing',
  alerts: [
    { status: 'firing', labels: { alertname: 'KubeNodeNotReady', cluster: 'prod-01', severity: 'critical' }, startsAt: '2026-11-20T09:00:00Z', endsAt: '0001-01-01T00:00:00Z' },
    { status: 'firing', labels: { alertname: 'KubeNodeNotReady', cluster: 'prod-02', severity: 'critical' }, startsAt: '2026-11-20T09:05:00Z', endsAt: '0001-01-01T00:00:00Z' },
    { status: 'resolved', labels: { alertname: 'DiskFull', cluster: 'stg-01', severity: 'warning' }, startsAt: '2026-11-20T08:00:00Z', endsAt: '2026-11-20T08:20:00Z' },
  ],
};

const CONTRIBUTING = `# Contributing

## Coding standards

1. CommonJS only. \`'use strict';\` at the top of every file.
2. Pure functions in \`src/\`: no I/O, no reading the clock. Time is passed in as an argument.
3. Every exported function has a test in \`test/\` using \`node:test\`.
4. Labels are accessed through a helper, never with deep property chains repeated across functions.
5. No new runtime dependencies without an ADR in \`docs/adr/\`.
6. Function names are verbs; booleans start with \`is\`/\`has\`.
`;

const SPEC = `# Spec: severity filter for the alert digest

Requested by: on-call team. Ticket: LOCAL-12 (fictional).

## Requirements

- R1: \`buildDigest(payload, { minSeverity })\` returns only entries with severity >= minSeverity.
- R2: Severity order: \`info\` < \`warning\` < \`critical\`.
- R3: Unknown severities are treated as \`warning\` (never dropped silently).
- R4: Default behaviour (no option) is unchanged.

## Out of scope

- Output formatting, colours, Slack/Teams posting.
`;

const PLAN = `# Plan: migrate CI from Jenkins to GitLab CI

Owner: platform team. Status: draft.

## Goal

Move all 140 Jenkins jobs to GitLab CI in Q1.

## Steps

1. Install GitLab runners on the private cloud (Kubernetes executor).
2. Convert Jenkinsfiles to .gitlab-ci.yml, one repo at a time.
3. Switch webhooks from Jenkins to GitLab.
4. Shut down Jenkins at end of Q1.

## Notes

- Some jobs deploy to production.
- Credentials are in the Jenkins credential store.
`;

const SEVERITY_FEATURE = `'use strict';

/**
 * Builds a digest from an Alertmanager webhook payload.
 * One digest entry per distinct alert (same alertname on the same cluster).
 */

const ZERO_TIME = '0001-01-01T00:00:00Z';
const SEVERITY_RANK = { info: 0, warning: 1, critical: 2 };

function alertKey(alert) {
  return alert.labels.alertname;
}

function durationMinutes(alert, now) {
  const start = Date.parse(alert.startsAt);
  const end = alert.endsAt ? Date.parse(alert.endsAt) : now.getTime();
  return Math.round((end - start) / 60000);
}

function colourFor(severity) {
  return { info: 'blue', warning: 'orange', critical: 'red' }[severity] || 'grey';
}

function buildDigest(payload, options = {}, now = new Date()) {
  const groups = new Map();
  for (const alert of payload.alerts || []) {
    const sev = alert.labels.severity;
    if (options.minSeverity && !(sev in SEVERITY_RANK)) continue;
    if (options.minSeverity && SEVERITY_RANK[sev] < SEVERITY_RANK[options.minSeverity]) continue;
    const key = alertKey(alert);
    const entry = groups.get(key) || {
      alertname: alert.labels.alertname,
      cluster: alert.labels.cluster,
      severity: alert.labels.severity,
      colour: colourFor(alert.labels.severity),
      count: 0,
      maxDurationMin: 0,
    };
    entry.count += 1;
    entry.maxDurationMin = Math.max(entry.maxDurationMin, durationMinutes(alert, new Date()));
    groups.set(key, entry);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count);
}

module.exports = { buildDigest, ZERO_TIME };
`;

function main() {
  if (fs.existsSync(target) && fs.readdirSync(target).length > 0) {
    console.error(`[setup] ${target} exists and is not empty. Choose another path or remove it.`);
    process.exit(1);
  }
  fs.mkdirSync(target, { recursive: true });
  git('init', '-q', '-b', 'main');

  write('package.json', JSON.stringify({ name: 'mp-practice', version: '0.0.0', private: true, scripts: { test: 'node --test' } }, null, 2) + '\n');
  write('README.md', '# mp-practice\n\nThrowaway repo for practising mattpocock-skills. Fictional data only.\n\nRun tests: `npm test`\n');
  write('src/parse-alerts.js', PARSE_ALERTS);
  write('test/parse-alerts.test.js', TESTS);
  write('CONTRIBUTING.md', CONTRIBUTING);
  write('config/thresholds.json', JSON.stringify({ diskUsageWarnPct: 80, diskUsageCritPct: 90, nodeNotReadyMin: 5 }, null, 2) + '\n');
  write('fixtures/alerts-multi-cluster.json', JSON.stringify(FIXTURE_MULTI_CLUSTER, null, 2) + '\n');
  commit('feat: alert digest module with basic grouping');

  write('docs/specs/severity-filter.md', SPEC);
  write('docs/plans/jenkins-to-gitlab-ci.md', PLAN);
  commit('docs: add severity filter spec and CI migration plan');

  git('checkout', '-q', '-b', 'feature/severity-filter');
  write('src/parse-alerts.js', SEVERITY_FEATURE);
  commit('feat: severity filter for digest (LOCAL-12)');

  git('checkout', '-q', 'main');
  git('checkout', '-q', '-b', 'conflict/raise-thresholds');
  write('config/thresholds.json', JSON.stringify({ diskUsageWarnPct: 85, diskUsageCritPct: 95, nodeNotReadyMin: 5 }, null, 2) + '\n');
  commit('chore: raise disk thresholds to cut alert noise\n\nOn-call reported 40 DiskFull pages/week on log volumes that self-clean at 90%.\nRaising globally to 85/95 per on-call retro action item AI-7.');

  git('checkout', '-q', 'main');
  git('checkout', '-q', '-b', 'conflict/per-plant-thresholds');
  write('config/thresholds.json', JSON.stringify({ diskUsageWarnPct: 80, diskUsageCritPct: 90, nodeNotReadyMin: 5, overrides: { 'plant-hanoi': { diskUsageCritPct: 88 } } }, null, 2) + '\n');
  commit('feat: per-plant threshold overrides\n\nPlant Hanoi MES database volumes must page earlier (88%) because\nautogrow is disabled there (storage team decision ST-31).');

  git('checkout', '-q', 'main');
  console.log(`[setup] practice repo ready: ${target}`);
  console.log('[setup] branches:');
  console.log(git('branch', '--list').trimEnd());
}

main();
