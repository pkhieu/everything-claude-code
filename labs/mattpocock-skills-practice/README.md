# Practice: `mattpocock-skills`

Hands-on exercises for the skills in the `mattpocock-skills` plugin (v1.2.3, by Matt Pocock, MIT, repo `mattpocock/skills`).
Each exercise has: what the skill really does (from its `SKILL.md`), strengths, weaknesses, how to use it correctly, where it works, and a copy-paste prompt.

Answer key for the planted problems: `ANSWER-KEY.md`. Do the exercise first, then compare.

## How skills load (why this matters)

| Kind | Example | Context cost | How to call |
|------|---------|--------------|-------------|
| Model-invocable | `grilling`, `wizard`, `tdd` | Description loaded every turn | Auto-triggers from your wording, or `/mattpocock-skills:<name>` |
| User-only (`disable-model-invocation: true`) | `teach`, `handoff`, `wait-what` | Zero until you call it | Only `/mattpocock-skills:<name>` |

If you type a plain request and the skill does not trigger, call it by slash command. Note in your results which wording triggered it.

## Where it works

| Surface | Works? | Notes |
|---------|--------|-------|
| Claude Code local (CLI, desktop app, IDE) | **Yes, best** | Full git, files, subagents. Can reach internal systems from the company network |
| Claude Code cloud (claude.ai/code) | Yes | Synced from the account. Cannot reach internal systems. Cannot run interactive scripts (wizard output must run on your machine) |
| Cowork (desktop app) | Yes | Plugin model is native there |
| claude.ai chat | Partial / unverified | Skills that spawn subagents (`research`, `code-review`), run git, or write repo files need Claude Code. Check whether your account exposes plugin skills in chat before relying on it |

## Setup (local Claude Code, recommended)

1. Install the plugin locally if it is not already there: run `/plugin` in Claude Code and find `mattpocock-skills` in the plugin directory, or follow the install steps in the `mattpocock/skills` README.
2. Create the practice repo (fictional data, throwaway):

   ```bash
   node labs/mattpocock-skills-practice/setup-practice-repo.js ~/mp-practice
   cd ~/mp-practice && npm test     # 1 passing test; it misses the planted bugs
   claude
   ```

3. Windows: run the setup script in Git Bash or PowerShell (Node only). `wizard` output is bash: run it in Git Bash or WSL.

Rule for every exercise: **read what the agent plans before approving**. You are evaluating the skill, not just getting an answer.

## Exercise order

Ranked by value for SRE / platform work. Do 1-6 first.

| # | Skill | Invocation | Value for you |
|---|-------|------------|---------------|
| 1 | wait-what | user-only | High (language) |
| 2 | grilling / grill-me | model / user | High |
| 3 | wizard | model | High |
| 4 | diagnosing-bugs | model | High |
| 5 | tdd | model | Medium |
| 6 | code-review (+ setup-matt-pocock-skills) | model | Medium |
| 7 | resolving-merge-conflicts | model | Medium, **risky defaults** |
| 8 | writing-for-agents | model | High (you write skills/CLAUDE.md) |
| 9 | research | model | Medium-high |
| 10 | teach | user-only | High (AI learning goal) |
| 11 | handoff | user-only | Medium |
| 12 | prototype | model | Low-medium |
| 13 | domain-modeling | model | Low-medium |
| 14 | codebase-design | model | Low |

---

## 1. `wait-what`

**What it does.** When an answer did not land, it makes the agent re-pitch: a bit of context, in **ASD-STE100 Simplified Technical English**, using the project's glossary (`CONTEXT.md`) if one exists.

- Strengths: one command, zero context cost. Simplified Technical English means short sentences and a limited vocabulary, which helps when English is not your first language.
- Weaknesses: only rephrases; it does not add new analysis. Without `CONTEXT.md` there is no project glossary to anchor on.
- Use correctly: call it right after a confusing answer. Do not use it to ask a new question.
- Scope: anywhere the plugin is installed.

**Practice prompt** (in `~/mp-practice`):

```
Explain how buildDigest in src/parse-alerts.js groups alerts and computes durations, including edge cases.
```

Then:

```
/mattpocock-skills:wait-what
```

Observe: is the re-pitch shorter and clearer? Would you use it in daily work?

---

## 2. `grilling` (and `grill-me`)

**What it does.** Interviews you about a plan as a **design tree**. Each round asks every question whose prerequisites are settled (the "frontier"), each with a **recommended answer**. It looks up facts itself (via subagents) instead of asking you. It does not act until you confirm shared understanding. `grill-me` is a user-only alias that calls `grilling`.

- Strengths: finds gaps you did not see; questions come with a recommendation, so you can answer fast; separates facts (agent's job) from decisions (your job).
- Weaknesses: long sessions; can over-question a small change. Quality depends on you answering honestly. It only plans; it produces no artifact unless you ask (`grill-with-docs` also writes ADRs/glossary).
- Use correctly: before an irreversible or expensive change (migration, cutover, architecture). Give it the plan file. Stop when the frontier is empty, then ask for a written summary.
- Scope: any surface; fact lookups need file access (Claude Code).

**Practice prompt:**

```
Grill me on docs/plans/jenkins-to-gitlab-ci.md. I am the platform lead. Constraints:
private cloud, on-prem GitLab, production deploys from CI, 8-person team.
```

Observe: did it catch credentials migration, production deploy safety, rollback, parallel run, runner capacity? Compare with `ANSWER-KEY.md`.

---

## 3. `wizard`

**What it does.** Generates an interactive **bash script** that walks a human through steps only a human can do (open URL, click, copy a value). It reads the repo first, confirms the stage list with you, builds from a template with progress, confirmation gates, hidden secret input and idempotent `.env` writes. It does **not** run the wizard itself; it checks it with `bash -n` / `shellcheck`.

- Strengths: turns a tribal-knowledge procedure into a repeatable script; secrets typed hidden, never echoed; confirmation before irreversible steps.
- Weaknesses: bash only (Windows needs Git Bash/WSL). The template's CI-secret helper targets GitHub (`gh`); for GitLab you must ask it to write to `.env` only or adapt to your tooling. The URLs and click paths it writes for your internal tools are only as accurate as what you tell it.
- Use correctly: give it the exact procedure and where each value should end up. Review the script before running. Keep it ephemeral unless it is a repeatable setup path.
- Scope: generate anywhere; **run only on your machine**.

**Practice prompt** (ties to the read-only MCP lab, Phase 0):

```
Create a wizard at scripts/grafana-lab-setup.sh that walks me through:
1. creating a Grafana service account "ai-lab-readonly" with role Viewer in our Grafana
   (https://grafana.example.internal, Administration > Users and access > Service accounts),
2. creating a token with 14-day expiry,
3. creating a Jira PAT for user ai-lab-readonly (Profile > Personal Access Tokens),
writing GRAFANA_URL, GRAFANA_SERVICE_ACCOUNT_TOKEN, JIRA_URL, JIRA_PERSONAL_TOKEN to .env.
Do not use gh or any CI secret store.
```

Observe: are tokens read with hidden input? Does it confirm before writing? Run `bash -n scripts/grafana-lab-setup.sh`. Do **not** run it with real values in this practice repo.

---

## 4. `diagnosing-bugs`

**What it does.** A strict discipline: **Phase 1 is building a tight, red-capable feedback loop** (failing test, CLI with fixture, replay, bisect...) before any theory. Then reproduce and minimise, hypothesise, fix. It redacts secrets in any shown output.

- Strengths: prevents "guess and patch". The loop doubles as the regression test. Works for performance regressions too (differential loop, bisection).
- Weaknesses: slow for trivial bugs. Weak where no loop can be built (prod-only infra issues); then it stops and asks for artifacts (logs, HAR, dumps). Code-oriented: for "etcd is slow on prod" it needs data you bring.
- Use correctly: describe the **symptom precisely** (input, expected, actual). Let it build the loop; do not push it to "just fix it".
- Scope: Claude Code (needs to run commands).

**Practice prompt:**

```
Diagnose this: the on-call digest shows "KubeNodeNotReady prod-01 count=2" but prod-02 also
has a NotReady node, and the duration for alerts still firing shows 0 minutes.
Reproduce with fixtures/alerts-multi-cluster.json.
```

Observe: did it build a red test **before** reading code for theories? Did it find **both** bugs? Is the final test kept?

---

## 5. `tdd`

**What it does.** Red → green, one vertical slice at a time. **Before writing any test it agrees the seams (public interfaces) with you.** Refactoring is explicitly not part of the loop. Anti-patterns it avoids: implementation-coupled, tautological tests, writing all tests first.

- Strengths: tests that survive refactoring; forces a decision on what the public interface is.
- Weaknesses: asks questions before coding (by design). Less natural for IaC/config, where "tests" are policy or plan checks (`engineering:testing-strategy` covers that better).
- Use correctly: answer the seam question explicitly ("test only `buildDigest`"). Let it do one slice per cycle.
- Scope: Claude Code.

**Practice prompt:**

```
Use TDD to implement R1-R4 from docs/specs/severity-filter.md on a new branch tdd/severity-filter from main.
```

Observe: did it ask for seams first? One failing test at a time? Compare its result with branch `feature/severity-filter` (which was written without TDD).

---

## 6. `code-review` (+ `setup-matt-pocock-skills`)

**What it does.** Reviews `git diff <fixed-point>...HEAD` on **two axes in parallel subagents**: **Standards** (repo docs like `CONTRIBUTING.md` plus a baseline of Fowler code smells) and **Spec** (missing requirements, scope creep, wrong implementation). It expects the issue tracker to be configured in `docs/agents/issue-tracker.md`; if missing it tells you to run `/mattpocock-skills:setup-matt-pocock-skills` first.

- Strengths: Spec axis catches "built the wrong thing", which bug-focused reviewers miss. Standards axis cites the exact repo rule.
- Weaknesses: needs a fixed point and, ideally, a spec. Setup assumes a tracker the agent can reach; on-prem Jira from cloud sessions is not reachable. Smells are heuristics, not bugs. Different purpose from built-in `/code-review` (bug hunting).
- Use correctly: run setup once per repo (choose the option closest to "local files / no tracker" if offered, or point it at `docs/specs/`). Always give the fixed point (`main`) and the spec path.
- Scope: Claude Code.

**Practice prompts:**

```
/mattpocock-skills:setup-matt-pocock-skills
```

Then:

```
git checkout feature/severity-filter
Review the changes since main. Spec: docs/specs/severity-filter.md.
```

Observe: did Spec find the R3 violation and the scope creep? Did Standards cite `CONTRIBUTING.md` rules? Run built-in `/code-review` on the same branch and compare.

---

## 7. `resolving-merge-conflicts`

**What it does.** Reads history and commit messages to understand the **intent** behind each side, preserves both where possible, runs checks, then **stages and commits**. Its rules say: always resolve, **never `--abort`**.

- Strengths: resolves by intent (reads why each change was made), not by "pick ours".
- Weaknesses / risk: it commits without asking and will not abort. On a shared or release branch that is dangerous.
- Use correctly: only on a local branch you own. Tell it explicitly: "show me the resolution and wait for approval before committing". Check `git show HEAD` afterwards.
- Scope: Claude Code.

**Practice prompt:**

```
git checkout -b practice/merge main
git merge conflict/raise-thresholds
git merge conflict/per-plant-thresholds      # conflicts
```

Then:

```
Resolve the in-progress merge conflict. Show me the proposed resolution and the reasoning
for each hunk, and wait for my approval before staging or committing.
```

Observe: did it read both commit messages (AI-7 noise reduction vs. ST-31 Hanoi autogrow disabled)? Did it keep the Hanoi override below the new global critical threshold? Did it respect your "wait for approval"?

---

## 8. `writing-for-agents`

**What it does.** Reference for writing anything an agent reads (skills, `CLAUDE.md`, `AGENTS.md`): context pointers, **context load vs cognitive load**, step vs reference, completion criteria, when to split, leading words. For skills it also reads `SKILL-MECHANICS.md` (frontmatter, invocation choice).

- Strengths: directly relevant to this audit: it explains why a long description costs every turn. Produces tighter skills.
- Weaknesses: opinionated vocabulary; it is a reference, so you must bring the content.
- Use correctly: when creating/editing a skill or `CLAUDE.md`. Ask it to justify the description length and invocation mode.
- Scope: any surface; writing files needs Claude Code.

**Practice prompt:**

```
Create a skill at .claude/skills/prometheus-alert-triage/SKILL.md for triaging a Prometheus alert:
read the alert payload, list read-only checks (PromQL, kubectl get/describe/logs), assess severity,
draft a status update. Decide whether it should be model-invocable or user-only, and justify the
description length in terms of context load.
```

Observe: description length, completion criteria per step, invocation choice reasoning.

---

## 9. `research`

**What it does.** Starts a **background agent** that researches against **primary sources** (official docs, source, specs) and writes one Markdown file with a citation per claim, saved where the repo keeps notes.

- Strengths: you keep working while it reads; citations make claims checkable; ends as a file, not chat.
- Weaknesses: needs web access (corporate proxy may block); background agents cost tokens; quality depends on sources being public.
- Use correctly: ask a narrow, answerable question with a decision in mind. Check two or three citations yourself.
- Scope: Claude Code (needs subagents and file writes).

**Practice prompt:**

```
Research: is Promtail deprecated in favour of Grafana Alloy, what is the end-of-life date, and what
is the official migration path? Primary sources only. Save to docs/research/.
```

Observe: are sources official (grafana.com, GitHub grafana/*)? Did it work in the background?

---

## 10. `teach` (user-only)

**What it does.** Turns the current directory into a **stateful teaching workspace**: `MISSION.md` (why you learn), `RESOURCES.md`, short HTML lessons in `lessons/`, learning records, reusable assets. Uses retrieval practice and spacing; distrusts its own memory and looks for high-quality sources first.

- Strengths: multi-session learning with memory in files; lessons are short with one tangible win; good fit for your "learn to apply AI" goal.
- Weaknesses: creates many files (use an empty folder); lessons are HTML (open in a browser); needs web access for resources.
- Use correctly: separate directory per topic. Start by stating your mission concretely.
- Scope: Claude Code local or desktop.

**Practice prompt** (in a new empty folder, e.g. `~/learn-promql`):

```
/mattpocock-skills:teach PromQL for SRE alerting: rate vs irate, histogram_quantile, recording rules,
and writing burn-rate alerts. Mission: write and review alert rules for our Kubernetes platform.
```

Observe: after lesson 1, come back next day and continue. Does it pick up from the learning records?

---

## 11. `handoff` (user-only)

**What it does.** Compacts the current conversation into a handoff document in the **OS temp directory** (not the repo), with a "suggested skills" section, references instead of duplicates, and secrets redacted.

- Strengths: clean continuation in a fresh session (less context, cheaper).
- Weaknesses: temp directory can be cleaned; move the file if you need it later.
- Use correctly: at the end of a long session, pass what the next session is for.
- Scope: any Claude Code surface.

**Practice prompt** (after exercises 4-6):

```
/mattpocock-skills:handoff Next session: finish the severity filter and open a merge request.
```

Observe: file location, redaction, does it reference branches/files instead of copying them?

---

## 12. `prototype`

**What it does.** Throwaway code that answers one design question. Two branches: **logic/state model** → a single HTML file with buttons and guided walkthroughs; **UI** → several radically different variants switchable on one route.

- Strengths: fast way to check a state machine before building it.
- Weaknesses: UI branch assumes a web app project; low value for infra work. Must be deleted or kept off main.
- Use correctly: state the question explicitly ("does this state model feel right?").
- Scope: Claude Code.

**Practice prompt:**

```
Prototype the logic of our incident lifecycle state model: Open -> Acknowledged -> Mitigated -> Resolved
-> PostmortemDone, with re-open from Resolved, and escalation when Acknowledged > 30 min without mitigation.
Does this state model feel right? Throwaway HTML.
```

Observe: can you click through edge cases (re-open after postmortem? escalate after mitigation?)?

---

## 13. `domain-modeling`

**What it does.** Actively sharpens terminology while you design: challenges conflicting terms against `CONTEXT.md` (a pure glossary, no implementation), invents edge-case scenarios, cross-checks with code, offers ADRs **only** when a decision is hard to reverse, surprising and a real trade-off.

- Strengths: catches overloaded words ("environment", "cluster", "tenant", "plant") that cause real incidents in multi-site platforms.
- Weaknesses: needs patience; overlaps with ADR writing in `engineering:architecture`.
- Use correctly: during design discussions; let it write `CONTEXT.md` as terms resolve.
- Scope: Claude Code.

**Practice prompt:**

```
Help me build CONTEXT.md for our platform terms: plant, site, cluster, environment, tenant, namespace,
application, service. Challenge me where they overlap.
```

---

## 14. `codebase-design`

**What it does.** Vocabulary and principles for **deep modules** (small interface, lots of behaviour), seams, adapters, the deletion test, "one adapter = hypothetical seam, two adapters = real seam". Used by `tdd` when the interface is in question.

- Strengths: precise language for module design and testability.
- Weaknesses: application-code oriented (TypeScript examples); limited direct use for scripts and IaC.
- Use correctly: when designing a library/module interface, or when `tdd` asks where the seam is.
- Scope: any surface.

**Practice prompt:**

```
Using codebase-design, evaluate the interface of src/parse-alerts.js. Is buildDigest a deep module?
Where should the seam for "time" and "label access" be? Apply the deletion test.
```

---

## Results sheet

Copy into `RESULTS.md` in your practice repo.

| # | Skill | Triggered by plain wording? | Useful (0-2) | Would use weekly? | Keep notes |
|---|-------|-----------------------------|--------------|-------------------|------------|
| 1 | wait-what | n/a (user-only) | | | |
| 2 | grilling | | | | |
| 3 | wizard | | | | |
| 4 | diagnosing-bugs | | | | |
| 5 | tdd | | | | |
| 6 | code-review | | | | |
| 7 | resolving-merge-conflicts | | | | |
| 8 | writing-for-agents | | | | |
| 9 | research | | | | |
| 10 | teach | n/a (user-only) | | | |
| 11 | handoff | n/a (user-only) | | | |
| 12 | prototype | | | | |
| 13 | domain-modeling | | | | |
| 14 | codebase-design | | | | |

Feed the results back into `docs/context-tools-audit.md` (Group 5, duplicates with Group 4).
