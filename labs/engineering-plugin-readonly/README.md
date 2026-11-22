# Lab: `engineering` plugin with read-only MCP (Grafana, Jira, Confluence)

Hands-on lab to evaluate Anthropic's `engineering` plugin on a company laptop (`laptop-c`),
first offline, then against internal systems with **read-only** access only,
first with a human approving every call (HITL), then unattended (AFK).

The lab answers one question for the context-tools audit
(`docs/context-tools-audit.md`, Group 4): which `engineering` skills are worth keeping.

## Safety principles

1. **Read-only is enforced in five independent layers.** Any single layer failing must not allow a write.
2. **Fail closed.** Unknown tool, unknown server, broken policy file: denied.
3. **One step at a time, with a gate.** Do not start a phase until the previous gate passes.
4. **Negative tests before positive tests.** Prove writes are blocked before running any real read.
5. **Every call is logged.** Metadata only, never response bodies.
6. **A kill switch is always one command away.** See `docs/07-kill-switch.md`.

| Layer | Control | Where | Stops |
|-------|---------|-------|-------|
| L1 Credential | Grafana service account `Viewer`; Jira/Confluence dedicated user with browse-only permissions and a PAT | Grafana / Jira / Confluence admin | Everything, including Bash + stolen token |
| L2 MCP server | `mcp-grafana --disable-write`; `mcp-atlassian READ_ONLY_MODE=true` | `.mcp.json` | Write tools are not even exposed |
| L3 Claude Code permissions | `deny` rules for write tools, plugin servers, WebFetch, curl, secrets; `bypassPermissions` disabled | `.claude/settings.json` | Write tools that L2 missed |
| L4 Guard hook | `hooks/mcp-readonly-guard.js`: server allowlist, write-verb detection, AFK allowlist-only | `config/readonly-policy.json` | New or renamed tools, Bash exfiltration |
| L5 Human / mode | HITL: approve each call. AFK: `dontAsk` mode, no Bash/Edit/Write | Phase 4 / Phase 5 | Anything unexpected |

Optional L0: enforce L3 and L4 machine-wide with `managed-settings.json` (see `docs/03-phase2-guardrails.md`).

## Folder map

```
labs/engineering-plugin-readonly/
├── README.md                     this file
├── .claude/settings.json         L3 permissions + L4 hook registration
├── .mcp.json.example             L2 MCP config template (copy to .mcp.json)
├── .gitignore                    keeps .mcp.json, .env, logs/, reports/ out of git
├── config/readonly-policy.json   L4 policy: allowed servers, verbs, tool allowlist
├── hooks/
│   ├── mcp-readonly-guard.js     PreToolUse guard (fail-closed)
│   └── mcp-audit-log.js          PostToolUse audit log (JSONL, metadata only)
├── scripts/
│   ├── verify-guard.js           offline self-test of the guard (30 cases)
│   ├── preflight-check.js        config + env check before each phase
│   └── afk-run.js                headless read-only run of one scenario
├── docs/                         walkthrough, one file per phase
├── test-cases/TEST-CASES.md      all test cases with expected results
├── scenarios/
│   ├── offline/                  S01-S10: skills with fixture data, no MCP
│   ├── live/                     L01-L05: HITL scenarios against real systems
│   └── afk/                      A01-A02: prompts for unattended runs
└── fixtures/                     fictional alerts, logs, configs used by offline scenarios
```

## Phases and gates

| Phase | Doc | What | Gate to continue |
|-------|-----|------|------------------|
| 0 | `docs/01-phase0-prerequisites.md` | Approvals, read-only accounts, laptop tools | Data-handling approval obtained; L1 accounts verified read-only |
| 1 | `docs/02-phase1-offline-skills.md` | Install plugin, run S01-S10 with fixtures, no MCP | Each skill scored; no network calls made |
| 2 | `docs/03-phase2-guardrails.md` | Verify L3 + L4 offline and inside Claude Code | `verify-guard` 30/30; TC-G* all pass |
| 3 | `docs/04-phase3-mcp-connect.md` | Connect one server at a time, discover tools, negative tests then smoke reads | TC-M* all pass for that server |
| 4 | `docs/05-phase4-hitl.md` | Live scenarios L01-L05, human approves every call | No write attempt reached a server; outputs scored |
| 5 | `docs/06-phase5-afk.md` | Unattended runs A01-A02 | 3 clean runs; zero unexpected denies |
| 6 | `docs/08-evaluation.md` | Score skills, decide keep/remove | Decisions copied back into the audit |

Rollback at any point: `docs/07-kill-switch.md`.

## Quick start (Phase 1-2 only, no credentials needed)

```bash
cp -r labs/engineering-plugin-readonly ~/ecc-lab   # work outside the repo
cd ~/ecc-lab
node scripts/verify-guard.js          # expect 30/30 passed
node scripts/preflight-check.js --offline
```

## Platform notes

- Scripts are plain Node.js (>= 18) and run on Windows, macOS and Linux.
- Hook commands use `$CLAUDE_PROJECT_DIR`. On Windows, Claude Code runs hooks through Git Bash, so the syntax works as written.
- Commands in the docs are shown in bash. PowerShell equivalents are given where they differ.
