# Phase 1: Offline skill evaluation (no MCP, no credentials)

Goal: see what each `engineering` skill produces using fictional fixture data. No network access to internal systems.

## 1.1 Install the plugin locally

```bash
claude plugin marketplace add anthropics/knowledge-work-plugins
claude plugin install engineering@knowledge-work-plugins
```

The plugin also registers 8 SaaS MCP servers (Slack, Linear, Asana, Atlassian Cloud, Notion, GitHub, PagerDuty, Datadog). They need OAuth and stay disconnected. The lab denies them anyway (`mcp__plugin_engineering_*` in `.claude/settings.json`, and the guard's server allowlist).

## 1.2 Start a session in the lab folder

```bash
cd ~/ecc-lab
claude
```

Inside the session, confirm:

- [ ] `/plugin` (or `/plugins`) lists `engineering`.
- [ ] `/mcp` shows no connected lab server (no `.mcp.json` yet). Plugin servers show as needing auth or failed. Do not authenticate them.
- [ ] `/hooks` lists the PreToolUse guard and PostToolUse audit hooks.

## 1.3 Run scenarios S01-S10

For each file in `scenarios/offline/`:

1. Open the scenario file. Copy the **Prompt** block into the session.
2. Approve only `Read` of files under `fixtures/` when prompted.
3. Save the output to `reports/offline/<scenario-id>.md` (copy-paste, or let the agent write it and approve that single Write).
4. Score it with the checklist in the scenario file and the rubric in `docs/08-evaluation.md`.

| ID | Skill | Fixture |
|----|-------|---------|
| S01 | incident-response | `fixtures/alert-kube-api-error-budget.json`, `fixtures/apiserver-log-excerpt.txt` |
| S02 | deploy-checklist | `fixtures/k8s-upgrade-context.md` |
| S03 | architecture | `fixtures/gitops-decision-context.md` |
| S04 | system-design | `fixtures/log-pipeline-requirements.md` |
| S05 | tech-debt | `fixtures/ansible-role-sample.yml` |
| S06 | debug | `fixtures/apiserver-log-excerpt.txt` |
| S07 | code-review | `fixtures/terraform-change.diff` |
| S08 | documentation | `fixtures/etcd-restore-notes.md` |
| S09 | testing-strategy | `fixtures/terraform-change.diff` |
| S10 | standup | none (paste your own notes) |

Tip: run each skill twice. Once via its slash command (`/engineering:incident-response ...`), once with a plain prompt that does not name the skill. This tells you whether auto-triggering works for your wording.

## 1.4 Compare with alternatives (duplicates)

Four skills overlap with skills you may keep from other plugins. Run the same fixture with both and compare:

| engineering skill | Compare with |
|-------------------|--------------|
| debug | `mattpocock-skills:diagnosing-bugs` |
| code-review | built-in `/code-review`, `/security-review` |
| documentation | `tech-doc-composer`, `devops-visual-docs` |
| testing-strategy | `mattpocock-skills:tdd` |

## Gate

- [ ] All 10 scenarios scored.
- [ ] `logs/guard-decisions.jsonl` contains no MCP calls (expected: none, since no lab server exists).
- [ ] TC-O01 to TC-O03 pass.
