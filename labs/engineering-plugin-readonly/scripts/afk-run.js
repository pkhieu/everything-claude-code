#!/usr/bin/env node
/**
 * Unattended (AFK) read-only run of one scenario with Claude Code headless mode.
 *
 * Safety:
 *   - runs preflight first and aborts on any FAIL
 *   - LAB_GUARD_MODE=afk: guard allows only toolAllowlist entries
 *   - --permission-mode dontAsk: anything not pre-approved is auto-denied (no prompt to hang on)
 *   - Bash, Edit, Write, WebFetch, WebSearch disallowed; output captured from stdout only
 *   - hard timeout; report flags every guard deny for human review
 *
 * Usage: node scripts/afk-run.js --scenario scenarios/afk/A01-daily-health-digest.txt [--timeout-sec 600] [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const LAB_DIR = path.resolve(__dirname, '..');
const DISALLOWED = ['Bash', 'Edit', 'Write', 'NotebookEdit', 'WebFetch', 'WebSearch'];

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function fail(msg) {
  console.error(`[afk-run] ${msg}`);
  process.exit(1);
}

function buildAllowedTools(policy) {
  const tools = ['Skill', 'Read', 'Grep', 'Glob'];
  for (const [server, names] of Object.entries(policy.toolAllowlist)) {
    for (const name of names) tools.push(`mcp__${server}__${name}`);
  }
  return tools;
}

function summarizeDecisions(sessionId) {
  const file = path.join(LAB_DIR, 'logs', 'guard-decisions.jsonl');
  if (!sessionId || !fs.existsSync(file)) return { allow: 0, deny: 0, other: 0, denied: [] };
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const mine = lines.filter((l) => l.session_id === sessionId);
  const denied = mine.filter((l) => l.decision === 'deny');
  return {
    allow: mine.filter((l) => l.decision === 'allow').length,
    deny: denied.length,
    other: mine.filter((l) => !['allow', 'deny'].includes(l.decision)).length,
    denied: denied.map((l) => `${l.tool_name}: ${l.reason}`),
  };
}

function main() {
  const scenario = arg('--scenario');
  const timeoutSec = Number(arg('--timeout-sec', '600'));
  const dryRun = process.argv.includes('--dry-run');
  if (!scenario) fail('missing --scenario <file>');
  const scenarioPath = path.resolve(LAB_DIR, scenario);
  if (!fs.existsSync(scenarioPath)) fail(`scenario not found: ${scenarioPath}`);
  const prompt = fs.readFileSync(scenarioPath, 'utf8').trim();

  const policy = JSON.parse(fs.readFileSync(path.join(LAB_DIR, 'config', 'readonly-policy.json'), 'utf8'));
  const allowed = buildAllowedTools(policy);
  if (allowed.length === 4) fail('toolAllowlist is empty; finish Phase 3 discovery first');

  const cliArgs = [
    '-p', prompt,
    '--permission-mode', 'dontAsk',
    '--allowedTools', allowed.join(','),
    '--disallowedTools', DISALLOWED.join(','),
    '--output-format', 'json',
  ];
  const env = { ...process.env, LAB_GUARD_MODE: 'afk' };

  if (dryRun) {
    console.log(JSON.stringify({ cwd: LAB_DIR, env: { LAB_GUARD_MODE: 'afk' }, command: 'claude', args: cliArgs }, null, 2));
    return;
  }

  const preflight = spawnSync('node', [path.join(__dirname, 'preflight-check.js')], { encoding: 'utf8', stdio: 'inherit' });
  if (preflight.status !== 0) fail('preflight failed; aborting AFK run');

  const started = new Date();
  const run = spawnSync('claude', cliArgs, { cwd: LAB_DIR, env, encoding: 'utf8', timeout: timeoutSec * 1000, maxBuffer: 32 * 1024 * 1024 });

  const stamp = started.toISOString().replace(/[:.]/g, '-');
  const name = path.basename(scenarioPath, path.extname(scenarioPath));
  const reportDir = path.join(LAB_DIR, 'reports');
  fs.mkdirSync(reportDir, { recursive: true });

  let parsed = null;
  try { parsed = JSON.parse(run.stdout); } catch (_err) { parsed = null; }
  const sessionId = parsed && parsed.session_id;
  const decisions = summarizeDecisions(sessionId);
  const timedOut = run.error && run.error.code === 'ETIMEDOUT';

  const md = [
    `# AFK run: ${name}`,
    '',
    `- Started: ${started.toISOString()}`,
    `- Exit code: ${run.status}${timedOut ? ' (TIMEOUT)' : ''}`,
    `- Session: ${sessionId || 'unknown'}`,
    `- Guard decisions: allow=${decisions.allow} deny=${decisions.deny} other=${decisions.other}`,
    decisions.deny ? '- **ATTENTION: guard denied calls. Review before trusting this report.**' : '- No denied calls.',
    ...decisions.denied.map((d) => `  - ${d}`),
    '',
    '## Result',
    '',
    parsed && parsed.result ? parsed.result : '```\n' + (run.stdout || run.stderr || '(no output)') + '\n```',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(reportDir, `${stamp}-${name}.json`), run.stdout || '');
  fs.writeFileSync(path.join(reportDir, `${stamp}-${name}.md`), md);
  console.log(`[afk-run] report: reports/${stamp}-${name}.md`);
  process.exit(run.status === 0 && !timedOut ? 0 : 1);
}

main();
