#!/usr/bin/env node
/**
 * [McpAuditLog] PostToolUse hook: append one JSONL line per MCP call.
 *
 * Logs metadata only (tool name, input, response size). The response body is NOT logged,
 * because it may contain production data. Never blocks: exits 0 on any error.
 */

const fs = require('fs');
const path = require('path');

const LAB_DIR = path.resolve(__dirname, '..');
const LOG_DIR = process.env.LAB_LOG_DIR || path.join(LAB_DIR, 'logs');
const MAX_INPUT_CHARS = 2000;

function main(raw) {
  try {
    const input = JSON.parse(raw);
    const response = input.tool_response;
    const responseText = typeof response === 'string' ? response : JSON.stringify(response || '');
    let toolInput = JSON.stringify(input.tool_input || {});
    if (toolInput.length > MAX_INPUT_CHARS) toolInput = toolInput.slice(0, MAX_INPUT_CHARS) + '...[truncated]';

    const entry = {
      ts: new Date().toISOString(),
      session_id: input.session_id,
      mode: process.env.LAB_GUARD_MODE || 'hitl',
      permission_mode: input.permission_mode,
      tool_name: input.tool_name,
      tool_input: toolInput,
      response_chars: responseText.length,
      duration_ms: input.duration_ms,
    };
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(path.join(LOG_DIR, 'mcp-audit.jsonl'), JSON.stringify(entry) + '\n');
  } catch (err) {
    process.stderr.write(`[McpAuditLog] warn: ${err.message}\n`);
  }
  process.exit(0);
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => main(raw));
