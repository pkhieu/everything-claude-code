# Handoff: evaluate `deep-research` vs `mattpocock-skills:research`

Paste everything below the line into a new Claude Code session (cloud, on repo `pkhieu/everything-claude-code`, branch `docs/context-tools-audit`).

---

You are evaluating two research skills head to head, to decide which one to keep in the user's always-loaded context. Work autonomously; do not ask the user questions unless a step is impossible.

## The two skills

| ID | Skill | How it works (from its SKILL.md) |
|----|-------|----------------------------------|
| DR | `deep-research` | Coordinator. May ask follow-up questions, decomposes the question into subtopics, spawns parallel foreground research subagents, then a report-writer subagent. Writes `research_notes/<title>/` and `reports/<title>` in the current directory |
| MR | `mattpocock-skills:research` | Spawns one background agent that researches primary sources only and writes a single Markdown file with a citation per claim |

## Setup

```bash
git fetch origin docs/context-tools-audit && git checkout docs/context-tools-audit && git pull --ff-only
mkdir -p labs/research-skills-eval/outputs
```

Before each run, record the start time. If the `get_session` tool (claude-code-remote) is available, record `external_metadata.usage.cost_usd` before and after each run to get the cost per run.

## Rules for a fair test

1. Give both skills **exactly the same question text** (below). Add nothing else: no hints, no sources, no expected answer.
2. Alternate order: T1, T3, T5 run DR first; T2, T4 run MR first.
3. Do not read the first skill's output before the second run finishes.
4. Invoke explicitly: `/deep-research <question>` and `/mattpocock-skills:research <question>`. If a slash call fails, call the Skill tool with the skill name.
5. If DR asks follow-up questions, answer: "No further constraints. Use your best judgement." Count the questions.
6. After each run, move or copy the outputs into `labs/research-skills-eval/outputs/<task>/<DR|MR>/`. Do not edit them.
7. Public web only. No internal systems. Do not modify files outside `labs/research-skills-eval/`.

## The five tasks

Each covers a different kind of research an SRE does.

| Task | Kind | Question (use verbatim) |
|------|------|-------------------------|
| T1 | Single fact with dates | Is Promtail deprecated in favour of Grafana Alloy? What are the official end-of-support dates and the official migration path? |
| T2 | Comparison for a decision | Argo CD vs Flux in 2026 for an air-gapped, multi-tenant private cloud with 40 Kubernetes clusters, LDAP/AD SSO and on-prem GitLab: which fits better and why? |
| T3 | Security / freshness | What critical or high CVEs affected ingress-nginx (Kubernetes community controller) from 2025 to today, which versions fix them, and what mitigations exist for clusters that cannot upgrade immediately? |
| T4 | Primary-source API facts | What APIs were removed or deprecated between Kubernetes 1.30 and 1.33, and what do the official kubeadm upgrade notes require for each minor-version step? |
| T5 | Niche landscape | Which MCP servers exist for Grafana, Jira/Confluence Data Center (on-prem) and ServiceNow? For each: maintainer, maintenance activity, read-only mode support, and auth methods. |

## Evaluation (do after both runs of a task)

For each output, measure:

| Metric | How |
|--------|-----|
| Wall time (min) | start to final file |
| Cost (USD) | `cost_usd` delta, or "n/a" |
| Questions asked | count |
| Sources cited | count of distinct URLs |
| Primary-source share | % of cited URLs that are official docs, vendor/project sites, source repos, CVE/NVD/GitHub advisories |
| Citation check | pick 3 claims at random; open each cited URL with WebFetch; score 1 if the page supports the claim, else 0 (0-3) |
| Correctness | your independent verification of the key facts (0-2): 0 wrong on a key fact, 1 minor errors, 2 correct |
| Freshness | newest date it reports vs today; any stale claim flagged (0-2) |
| Actionability | does it answer the question directly with a recommendation or clear next step (0-2) |
| Length | words in the final report |
| Output form | where it landed, single file or many, easy to reuse in a repo |

Do the citation check and correctness check yourself, after both runs, with fresh WebFetch calls. Do not trust either report.

## Deliverable

Write `labs/research-skills-eval/RESULTS.md`:

1. One table per task: metrics for DR and MR side by side, plus 2-3 lines on notable differences.
2. Summary table across tasks: totals/averages per metric.
3. Recommendation: keep DR, keep MR, or keep both (and for which kind of task). Justify with numbers. Consider the context cost: DR's description is ~570 characters loaded every turn; MR's is ~240.
4. Caveats: anything that made the comparison unfair.

Then:

```bash
git add labs/research-skills-eval && git commit -m "docs: research skills evaluation results" && git push origin docs/context-tools-audit
```

If the push is rejected, `git pull --no-rebase origin docs/context-tools-audit` and push again.

Finally, if the `send_message` tool (claude-code-remote) is available, send to session `session_011PQc1PF4zmCfXCArRKMSeZ` a message of at most 15 lines: the recommendation, the summary table, and the path `labs/research-skills-eval/RESULTS.md`. If it is not available, end with that summary in your final reply.
