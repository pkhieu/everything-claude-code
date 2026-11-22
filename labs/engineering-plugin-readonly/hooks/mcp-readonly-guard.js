#!/usr/bin/env node
/**
 * [McpReadonlyGuard] PreToolUse hook for the read-only MCP lab.
 *
 * Modes (env LAB_GUARD_MODE):
 *   hitl (default) - write tools denied, everything else falls through to a human prompt.
 *   afk            - only tools in toolAllowlist are allowed; everything else denied.
 *   any other value is treated as afk (strictest).
 *
 * Fail-closed by design: if stdin or the policy cannot be parsed, the call is blocked
 * (exit 2). This deliberately differs from the repo convention "exit 0 on parse errors",
 * because this hook is a security control.
 */

const fs = require('fs');
const path = require('path');

const LAB_DIR = path.resolve(__dirname, '..');
const POLICY_PATH = process.env.LAB_POLICY_PATH || path.join(LAB_DIR, 'config', 'readonly-policy.json');
const LOG_DIR = process.env.LAB_LOG_DIR || path.join(LAB_DIR, 'logs');

function block(reason) {
  process.stderr.write(`[McpReadonlyGuard] BLOCKED: ${reason}\n`);
  process.exit(2);
}

function loadPolicy() {
  const policy = JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'));
  for (const key of ['allowedServers', 'readVerbs', 'writeVerbs', 'toolAllowlist', 'toolDenylist', 'bashDenyPatterns']) {
    if (!(key in policy)) throw new Error(`policy missing key: ${key}`);
  }
  return policy;
}

function resolveMode() {
  const raw = (process.env.LAB_GUARD_MODE || 'hitl').toLowerCase();
  return raw === 'hitl' ? 'hitl' : 'afk';
}

/** Split "mcp__<server>__<tool>" at the first "__" after the prefix. */
function parseMcpName(toolName) {
  const rest = toolName.slice('mcp__'.length);
  const idx = rest.indexOf('__');
  if (idx <= 0) return { server: rest, tool: '' };
  return { server: rest.slice(0, idx), tool: rest.slice(idx + 2) };
}

/** "jira_getIssue-v2" -> ["jira", "get", "issue", "v2"] */
function tokenize(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function classifyMcp(policy, mode, toolName) {
  const { server, tool } = parseMcpName(toolName);
  const allowlist = policy.toolAllowlist[server] || [];
  const denylist = policy.toolDenylist[server] || [];
  const words = tokenize(tool);

  if (!policy.allowedServers.includes(server)) {
    return { decision: 'deny', reason: `MCP server "${server}" is not in allowedServers` };
  }
  if (!tool) {
    return { decision: 'deny', reason: `cannot parse tool name "${toolName}"` };
  }
  if (denylist.includes(tool)) {
    return { decision: 'deny', reason: `tool "${tool}" is in toolDenylist` };
  }
  const writeWord = words.find((w) => policy.writeVerbs.includes(w));
  if (writeWord) {
    return { decision: 'deny', reason: `tool "${tool}" contains write verb "${writeWord}"` };
  }
  if (allowlist.includes(tool)) {
    return mode === 'afk'
      ? { decision: 'allow', reason: `tool "${tool}" is in toolAllowlist` }
      : { decision: 'none', reason: `tool "${tool}" is in toolAllowlist (human still approves)` };
  }
  const isRead = words.some((w) => policy.readVerbs.includes(w));
  if (mode === 'afk') {
    return { decision: 'deny', reason: `AFK mode: tool "${tool}" is not in toolAllowlist` };
  }
  return isRead
    ? { decision: 'ask', reason: `read-like tool "${tool}" not yet allowlisted; review before approving` }
    : { decision: 'ask', reason: `UNCLASSIFIED tool "${tool}"; verify it is read-only before approving` };
}

function classifyBash(policy, mode, command) {
  if (mode === 'afk') {
    return { decision: 'deny', reason: 'AFK mode: Bash is not allowed' };
  }
  for (const pattern of policy.bashDenyPatterns) {
    if (new RegExp(pattern, 'i').test(command)) {
      return { decision: 'deny', reason: `Bash command matches deny pattern /${pattern}/` };
    }
  }
  return { decision: 'none', reason: 'Bash command passed deny patterns' };
}

function classify(policy, mode, input) {
  const toolName = String(input.tool_name || '');
  if (toolName.startsWith('mcp__')) return classifyMcp(policy, mode, toolName);
  if (toolName === 'Bash') return classifyBash(policy, mode, String((input.tool_input || {}).command || ''));
  if (toolName === 'WebFetch' || toolName === 'WebSearch') {
    return { decision: 'deny', reason: `${toolName} is disabled in the lab (exfiltration risk)` };
  }
  return { decision: 'none', reason: 'not governed by this guard' };
}

function logDecision(entry) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(path.join(LOG_DIR, 'guard-decisions.jsonl'), JSON.stringify(entry) + '\n');
  } catch (err) {
    process.stderr.write(`[McpReadonlyGuard] warn: cannot write log: ${err.message}\n`);
  }
}

function main(raw) {
  let input;
  let policy;
  try {
    input = JSON.parse(raw);
  } catch (err) {
    block(`invalid hook input JSON (${err.message})`);
  }
  try {
    policy = loadPolicy();
  } catch (err) {
    block(`cannot load policy ${POLICY_PATH} (${err.message})`);
  }

  const mode = resolveMode();
  const result = classify(policy, mode, input);

  logDecision({
    ts: new Date().toISOString(),
    session_id: input.session_id,
    mode,
    permission_mode: input.permission_mode,
    tool_name: input.tool_name,
    decision: result.decision,
    reason: result.reason,
  });

  if (result.decision === 'none') process.exit(0);

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: result.decision,
      permissionDecisionReason: `[McpReadonlyGuard] ${result.reason}`,
    },
  }));
  process.exit(0);
}

if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => { raw += chunk; });
  process.stdin.on('end', () => main(raw));
}

module.exports = { classify, parseMcpName, tokenize };
