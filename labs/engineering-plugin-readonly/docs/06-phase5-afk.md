# Phase 5: Unattended (AFK) read-only runs

Goal: run a scenario with nobody watching, still read-only, with a report to review afterwards.

## How AFK works in this lab

`scripts/afk-run.js` runs `claude -p` (headless) with:

| Setting | Value | Effect |
|---------|-------|--------|
| `LAB_GUARD_MODE` | `afk` | Guard allows only `toolAllowlist`; everything else denied |
| `--permission-mode` | `dontAsk` | Any call that would prompt is auto-denied. No hang waiting for a human |
| `--allowedTools` | `Skill,Read,Grep,Glob` + allowlisted MCP tools | Exactly what may run |
| `--disallowedTools` | `Bash,Edit,Write,NotebookEdit,WebFetch,WebSearch` | No shell, no file changes, no internet |
| `--output-format` | `json` | Result captured by the script into `reports/` |
| timeout | `--timeout-sec` (default 600) | Hard stop |

The script runs `preflight-check.js` first and refuses to start on any FAIL or an empty allowlist.

## Step 0: edit scenario placeholders

`scenarios/afk/*.txt` use `LAB` as the Jira project key and Confluence space. Replace with your lab project/space. Keep the limits (max N, instant queries).

## Step 1: dry run

```bash
cd ~/ecc-lab
node scripts/afk-run.js --scenario scenarios/afk/A01-daily-health-digest.txt --dry-run
```

Read the printed command. Confirm the allowed tools list contains only tools you reviewed in Phase 4.

## Step 2: first attended AFK run

Run it while you watch the terminal (but do not interact):

```bash
node scripts/afk-run.js --scenario scenarios/afk/A01-daily-health-digest.txt --timeout-sec 600
```

Open the report in `reports/`. Check:

- [ ] `Guard decisions: deny=0`. If deny > 0, read each reason. Either the prompt needs a tool you did not allowlist (decide consciously), or the agent tried something it should not (investigate).
- [ ] Result content is correct against what you see in Grafana/Jira.
- [ ] `logs/mcp-audit.jsonl` has only allowlisted tools for this session.

## Step 3: three clean runs

Run A01 and A02 at least three times over different days. Record each in `reports/afk-runs.md`:

| Date | Scenario | Exit | allow | deny | Correct? | Notes |
|------|----------|------|-------|------|----------|-------|

## Step 4 (optional): schedule

Only after 3 clean runs.

Linux / macOS (cron, weekdays 07:40):

```bash
# crontab -e  (the wrapper loads tokens from the OS secret store, see below)
40 7 * * 1-5 $HOME/bin/ecc-lab-afk.sh >> $HOME/ecc-lab/logs/afk-cron.log 2>&1
```

Example wrapper for Linux with `secret-tool` (libsecret). Store each token once with
`secret-tool store --label="ecc-lab grafana" service ecc-lab key grafana`:

```bash
#!/usr/bin/env bash
# ~/bin/ecc-lab-afk.sh
set -euo pipefail
cd "$HOME/ecc-lab"
export GRAFANA_URL="https://grafana.example.internal"
export JIRA_URL="https://jira.example.internal"
export CONFLUENCE_URL="https://confluence.example.internal"
GRAFANA_SERVICE_ACCOUNT_TOKEN="$(secret-tool lookup service ecc-lab key grafana)"
JIRA_PERSONAL_TOKEN="$(secret-tool lookup service ecc-lab key jira)"
CONFLUENCE_PERSONAL_TOKEN="$(secret-tool lookup service ecc-lab key confluence)"
export GRAFANA_SERVICE_ACCOUNT_TOKEN JIRA_PERSONAL_TOKEN CONFLUENCE_PERSONAL_TOKEN
exec node scripts/afk-run.js --scenario scenarios/afk/A01-daily-health-digest.txt
```

On macOS use `security find-generic-password -s ecc-lab-grafana -w` instead of `secret-tool lookup`.

Windows: Task Scheduler → Create Task → Action: `node.exe` with arguments `scripts\afk-run.js --scenario scenarios\afk\A01-daily-health-digest.txt`, start in `%USERPROFILE%\ecc-lab`.

Scheduling needs the tokens available to the scheduled job. Load them from an OS secret store (macOS Keychain, Windows Credential Manager, `secret-tool` on Linux) in a wrapper; never write them in plain text. On Windows, the PowerShell `SecretManagement` module can read from Credential Manager; test it on `laptop-c` before relying on it. If none of this is possible, keep AFK runs manual.

## Gate

- [ ] 3 clean runs per scenario (exit 0, deny=0, correct results).
- [ ] TC-A01 to TC-A05 pass.
