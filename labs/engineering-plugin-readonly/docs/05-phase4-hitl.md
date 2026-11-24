# Phase 4: Human-in-the-loop (HITL) live scenarios

Goal: run real SRE workflows with the `engineering` skills on live read-only data. A human approves every MCP call.

## How HITL works in this lab

- `LAB_GUARD_MODE` unset or `hitl`.
- Permission mode: `default`. No MCP tool is in `permissions.allow`, so **every MCP call prompts**.
- The guard adds context to the prompt:
  - write-like tools: denied before you see a prompt,
  - not-yet-allowlisted tools: forced `ask` with a reason ("UNCLASSIFIED tool ... verify it is read-only"),
  - allowlisted tools: normal prompt.

Approval checklist for each prompt (5 seconds):

1. Is the server `grafana` or `atlassian`?
2. Is the tool a read tool you recognise?
3. Are the arguments narrow (one project, short time range, small limit)?
4. If any answer is "no" or "not sure": **deny**, and note it in the scenario report.

Never pick "always allow" during Phase 4. Every call should be reviewed.

## Run

```bash
cd ~/ecc-lab
node scripts/preflight-check.js
claude
```

For each file in `scenarios/live/`, paste the **Prompt**, approve/deny per the checklist, save the output to `reports/live/<id>.md`, and fill in the scenario's checklist.

| ID | Skill | Systems |
|----|-------|---------|
| L01 | incident-response | Grafana (Prometheus) + Jira + Confluence |
| L02 | deploy-checklist | Jira + Confluence + Grafana |
| L03 | architecture | Confluence |
| L04 | tech-debt | Jira |
| L05 | documentation | Confluence + Grafana |

## Gate

- [ ] L01 to L05 completed and scored.
- [ ] Count of denied prompts and why, recorded per scenario.
- [ ] `logs/guard-decisions.jsonl`: every `deny` has a reason you agree with.
- [ ] No write reached any system (spot-check Jira/Confluence history of the lab project and space: no changes by `ai-lab-readonly`).
- [ ] TC-H01 to TC-H04 pass.

Before Phase 5, review `reports/*-tools.md`: any tool you approved 3+ times without hesitation is a candidate for the AFK allowlist. Anything else stays out.
