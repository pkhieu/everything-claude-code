#!/usr/bin/env node
/**
 * Offline self-test for hooks/mcp-readonly-guard.js.
 * Feeds synthetic PreToolUse events to the real hook process and checks each decision.
 * No network, no Claude Code, no MCP server needed.
 *
 * Usage: node scripts/verify-guard.js
 * Exit code: 0 = all cases pass, 1 = at least one failure.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const LAB_DIR = path.resolve(__dirname, '..');
const GUARD = path.join(LAB_DIR, 'hooks', 'mcp-readonly-guard.js');
const BASE_POLICY = JSON.parse(fs.readFileSync(path.join(LAB_DIR, 'config', 'readonly-policy.json'), 'utf8'));

// Test policy: base policy plus two allowlisted tools, so allow paths can be exercised.
const TEST_POLICY = {
  ...BASE_POLICY,
  toolAllowlist: { grafana: ['search_dashboards'], atlassian: ['jira_get_issue'] },
};

function runGuard({ mode, input, policyPath, rawInput }) {
  const logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-log-'));
  const env = { ...process.env, LAB_LOG_DIR: logDir, LAB_POLICY_PATH: policyPath };
  if (mode === undefined) delete env.LAB_GUARD_MODE;
  else env.LAB_GUARD_MODE = mode;
  const result = spawnSync('node', [GUARD], {
    encoding: 'utf8',
    input: rawInput !== undefined ? rawInput : JSON.stringify(input),
    env,
    timeout: 10000,
  });
  fs.rmSync(logDir, { recursive: true, force: true });
  if (result.status === 2) return 'block';
  if (result.status !== 0) return `error(${result.status}): ${result.stderr}`;
  if (!result.stdout.trim()) return 'none';
  return JSON.parse(result.stdout).hookSpecificOutput.permissionDecision;
}

const mcp = (name) => ({ tool_name: name, tool_input: {}, session_id: 'test' });
const bash = (command) => ({ tool_name: 'Bash', tool_input: { command }, session_id: 'test' });

// [id, description, mode, input, expected]
const CASES = [
  ['G01', 'HITL allowlisted read tool -> human prompt', 'hitl', mcp('mcp__grafana__search_dashboards'), 'none'],
  ['G02', 'HITL read-like tool not allowlisted -> ask', 'hitl', mcp('mcp__grafana__list_datasources'), 'ask'],
  ['G03', 'HITL unclassified tool -> ask', 'hitl', mcp('mcp__grafana__generate_deeplink'), 'ask'],
  ['G04', 'HITL write tool -> deny', 'hitl', mcp('mcp__grafana__update_dashboard'), 'deny'],
  ['G05', 'HITL jira create -> deny', 'hitl', mcp('mcp__atlassian__jira_create_issue'), 'deny'],
  ['G06', 'HITL jira transition -> deny', 'hitl', mcp('mcp__atlassian__jira_transition_issue'), 'deny'],
  ['G07', 'HITL confluence update -> deny', 'hitl', mcp('mcp__atlassian__confluence_update_page'), 'deny'],
  ['G08', 'HITL camelCase write verb -> deny', 'hitl', mcp('mcp__atlassian__jiraAddComment'), 'deny'],
  ['G09', 'Denylisted query_sql -> deny', 'hitl', mcp('mcp__grafana__query_sql'), 'deny'],
  ['G10', 'Plugin bundled server -> deny', 'hitl', mcp('mcp__plugin_engineering_slack__slack_read_channel'), 'deny'],
  ['G11', 'Unknown server -> deny', 'hitl', mcp('mcp__servicenow__get_incident'), 'deny'],
  ['G12', 'Read word that only contains a write verb as substring -> not denied', 'hitl', mcp('mcp__atlassian__jira_get_transitions'), 'ask'],
  ['A01', 'AFK allowlisted -> allow', 'afk', mcp('mcp__grafana__search_dashboards'), 'allow'],
  ['A02', 'AFK read-like not allowlisted -> deny', 'afk', mcp('mcp__grafana__list_datasources'), 'deny'],
  ['A03', 'AFK write -> deny', 'afk', mcp('mcp__atlassian__jira_create_issue'), 'deny'],
  ['A04', 'AFK Bash -> deny', 'afk', bash('ls -la'), 'deny'],
  ['A05', 'Invalid mode falls back to AFK', 'yolo', mcp('mcp__grafana__list_datasources'), 'deny'],
  ['A06', 'Unset mode defaults to HITL', undefined, mcp('mcp__grafana__list_datasources'), 'ask'],
  ['B01', 'Bash harmless -> none', 'hitl', bash('ls -la reports'), 'none'],
  ['B02', 'Bash curl -> deny', 'hitl', bash('curl -s https://grafana.local/api/dashboards'), 'deny'],
  ['B03', 'Bash PowerShell web request -> deny', 'hitl', bash('Invoke-RestMethod https://jira.local'), 'deny'],
  ['B04', 'Bash env dump -> deny', 'hitl', bash('env'), 'deny'],
  ['B05', 'Bash token echo -> deny', 'hitl', bash('echo $GRAFANA_SERVICE_ACCOUNT_TOKEN'), 'deny'],
  ['B06', 'Bash kubectl apply -> deny', 'hitl', bash('kubectl apply -f x.yaml'), 'deny'],
  ['B07', 'Bash kubectl get -> none', 'hitl', bash('kubectl get pods -n monitoring'), 'none'],
  ['B08', 'Bash cat .env -> deny', 'hitl', bash('cat .env'), 'deny'],
  ['W01', 'WebFetch -> deny', 'hitl', { tool_name: 'WebFetch', tool_input: { url: 'https://example.com' } }, 'deny'],
  ['W02', 'Read tool not governed -> none', 'hitl', { tool_name: 'Read', tool_input: { file_path: 'x' } }, 'none'],
];

function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-policy-'));
  const policyPath = path.join(tmp, 'policy.json');
  fs.writeFileSync(policyPath, JSON.stringify(TEST_POLICY));

  let failed = 0;
  for (const [id, desc, mode, input, expected] of CASES) {
    const actual = runGuard({ mode, input, policyPath });
    const ok = actual === expected;
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${desc} (expected=${expected}, actual=${actual})`);
  }

  // Fail-closed cases
  const badJson = runGuard({ mode: 'hitl', rawInput: 'not-json', policyPath });
  const badPolicy = runGuard({ mode: 'hitl', input: mcp('mcp__grafana__search_dashboards'), policyPath: path.join(tmp, 'missing.json') });
  for (const [id, desc, actual] of [['F01', 'Invalid stdin -> block', badJson], ['F02', 'Missing policy -> block', badPolicy]]) {
    const ok = actual === 'block';
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${desc} (expected=block, actual=${actual})`);
  }

  fs.rmSync(tmp, { recursive: true, force: true });
  const total = CASES.length + 2;
  console.log(`\n${total - failed}/${total} passed`);
  process.exit(failed ? 1 : 0);
}

main();
