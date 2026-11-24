#!/usr/bin/env node
/**
 * Preflight check for the read-only MCP lab. Run before every phase that touches real systems.
 * Never prints secret values; only reports whether variables are set.
 *
 * Usage: node scripts/preflight-check.js [--offline]
 *   --offline  skip checks that need .mcp.json and tokens (Phase 1-2)
 * Exit code: 0 = no FAIL, 1 = at least one FAIL.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { tokenize } = require('../hooks/mcp-readonly-guard');

const LAB_DIR = path.resolve(__dirname, '..');
const OFFLINE = process.argv.includes('--offline');
const results = [];

function record(level, name, detail) {
  results.push({ level, name, detail });
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(LAB_DIR, rel), 'utf8'));
}

function checkRuntime() {
  const major = Number(process.versions.node.split('.')[0]);
  record(major >= 18 ? 'PASS' : 'FAIL', 'node >= 18', `found ${process.versions.node}`);
  const claude = spawnSync('claude', ['--version'], { encoding: 'utf8' });
  if (claude.status === 0) record('PASS', 'claude CLI', claude.stdout.trim());
  else record('WARN', 'claude CLI', 'not found in PATH');
}

function checkPolicy(policy) {
  const bad = [];
  for (const [server, tools] of Object.entries(policy.toolAllowlist)) {
    if (!policy.allowedServers.includes(server)) bad.push(`${server} (server not allowed)`);
    for (const tool of tools) {
      const word = tokenize(tool).find((w) => policy.writeVerbs.includes(w));
      if (word) bad.push(`${server}/${tool} (write verb "${word}")`);
    }
  }
  record(bad.length ? 'FAIL' : 'PASS', 'policy allowlist has no write tools', bad.join(', ') || 'ok');
  const count = Object.values(policy.toolAllowlist).reduce((n, t) => n + t.length, 0);
  record(count ? 'PASS' : 'WARN', 'policy allowlist populated', `${count} tool(s); AFK runs need at least 1`);
}

function checkSettings() {
  const settings = readJson('.claude/settings.json');
  const perms = settings.permissions || {};
  record(perms.disableBypassPermissionsMode === 'disable' ? 'PASS' : 'FAIL',
    'bypassPermissions disabled', String(perms.disableBypassPermissionsMode));
  const pre = JSON.stringify((settings.hooks || {}).PreToolUse || []);
  record(pre.includes('mcp-readonly-guard.js') ? 'PASS' : 'FAIL', 'PreToolUse guard hook registered', '');
  const post = JSON.stringify((settings.hooks || {}).PostToolUse || []);
  record(post.includes('mcp-audit-log.js') ? 'PASS' : 'FAIL', 'PostToolUse audit hook registered', '');
  const wideAllow = (perms.allow || []).filter((r) => /^mcp__\*|^mcp__[^_]+__\*$|^Bash$|^Bash\(\*\)$/.test(r));
  record(wideAllow.length ? 'FAIL' : 'PASS', 'no wildcard allow rules', wideAllow.join(', ') || 'ok');
}

function checkMcpConfig(policy) {
  const file = path.join(LAB_DIR, '.mcp.json');
  if (!fs.existsSync(file)) {
    record('FAIL', '.mcp.json exists', 'copy .mcp.json.example to .mcp.json');
    return;
  }
  const servers = readJson('.mcp.json').mcpServers || {};
  for (const name of Object.keys(servers)) {
    record(policy.allowedServers.includes(name) ? 'PASS' : 'FAIL', `server "${name}" in allowedServers`, '');
    for (const [key, value] of Object.entries(servers[name].env || {})) {
      if (/TOKEN|SECRET|PASSWORD|API_KEY/.test(key) && !/^\$\{[A-Z0-9_]+\}$/.test(value)) {
        record('FAIL', `${name}.${key} uses env reference`, 'hardcoded secret in .mcp.json; use ${VAR}');
      }
    }
  }
  if (servers.grafana) {
    const args = servers.grafana.args || [];
    record(args.includes('--disable-write') ? 'PASS' : 'FAIL', 'grafana --disable-write', args.join(' '));
    record(args.includes('--enable-query') ? 'FAIL' : 'PASS', 'grafana no --enable-query', '');
  }
  if (servers.atlassian) {
    const env = servers.atlassian.env || {};
    record(env.READ_ONLY_MODE === 'true' ? 'PASS' : 'FAIL', 'atlassian READ_ONLY_MODE=true', String(env.READ_ONLY_MODE));
    for (const key of ['JIRA_SSL_VERIFY', 'CONFLUENCE_SSL_VERIFY']) {
      if (env[key] === 'false') record('WARN', key, 'TLS verification disabled; use the corporate CA bundle instead');
    }
  }
  const required = new Set();
  for (const server of Object.values(servers)) {
    for (const value of Object.values(server.env || {})) {
      const m = /^\$\{([A-Z0-9_]+)\}$/.exec(value);
      if (m) required.add(m[1]);
    }
  }
  for (const name of required) {
    record(process.env[name] ? 'PASS' : 'FAIL', `env ${name}`, process.env[name] ? 'set (value hidden)' : 'missing');
  }
}

function checkGitignore() {
  const file = path.join(LAB_DIR, '.gitignore');
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const missing = ['.mcp.json', '.env', 'logs/', 'reports/'].filter((e) => !text.split(/\r?\n/).includes(e));
  record(missing.length ? 'FAIL' : 'PASS', '.gitignore covers secrets and logs', missing.join(', ') || 'ok');
}

function checkGuard() {
  const run = spawnSync('node', [path.join(__dirname, 'verify-guard.js')], { encoding: 'utf8' });
  const summary = (run.stdout.trim().split('\n').pop() || '').trim();
  record(run.status === 0 ? 'PASS' : 'FAIL', 'guard self-test', summary);
}

function main() {
  const policy = readJson('config/readonly-policy.json');
  checkRuntime();
  checkPolicy(policy);
  checkSettings();
  checkGitignore();
  checkGuard();
  if (!OFFLINE) checkMcpConfig(policy);

  for (const r of results) console.log(`${r.level.padEnd(4)} ${r.name}${r.detail ? `: ${r.detail}` : ''}`);
  const fails = results.filter((r) => r.level === 'FAIL').length;
  console.log(`\n${fails ? `PREFLIGHT FAILED (${fails})` : 'PREFLIGHT OK'}${OFFLINE ? ' [offline]' : ''}`);
  process.exit(fails ? 1 : 0);
}

main();
