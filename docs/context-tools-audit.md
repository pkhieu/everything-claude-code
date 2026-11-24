# Context Window Tools Audit

Scope: Claude Code cloud session (claude.ai connectors + synced plugins + skills).
Goal: decide for each tool: **Keep-Global** (always loaded), **Keep-OnDemand** (load only when needed), or **Remove**.

## How tools consume context

| Type | What is loaded every turn | Cost |
|------|---------------------------|------|
| MCP tool, fully loaded | Full JSON schema (name + description + params) | High (hundreds to thousands of tokens per tool) |
| MCP tool, deferred | Tool name only; schema fetched via ToolSearch when needed | Very low |
| MCP server needing auth | One line in the system prompt | Very low, but it is noise |
| Skill | `name` + `description` from frontmatter | Low to medium (descriptions range 30 to 1,000 chars) |
| Skill body (`SKILL.md`) | Only loaded when the skill is invoked | Zero until used |

Levers:

- **Global**: connector enabled at account level / plugin installed user-wide.
- **On-demand**: connector toggled per project or per session; plugin installed only in projects that need it; MCP left deferred.
- **Remove**: disconnect connector / uninstall plugin / delete skill.

Skill-level levers in Claude Code (from the Claude Code skills docs; verify on your version):

| Lever | Scope | Effect |
|-------|-------|--------|
| Frontmatter `disable-model-invocation: true` | One skill | Description not in context; only the user can run it with `/name`. Claude's Skill-tool calls are blocked unless the user's message contains `/name` |
| Frontmatter `user-invocable: false` | One skill | Hidden from the `/` menu; Claude can still invoke it |
| Setting `skillOverrides` (`on`, `name-only`, `user-invocable-only`, `off`) | Per skill, per machine (`/skills` writes `.claude/settings.local.json`) | Changes visibility without editing the skill. **Does not affect plugin skills** |
| Permission rule `Skill(name)` / `Skill(name *)` in `deny` | Per skill | Blocks invocation |
| Setting `syncClaudeAiSkills: false` (user settings) | All claude.ai-synced skills on that machine | Stops syncing; already-synced skills move to `~/.claude/skills/.trash/` |
| claude.ai account skill toggle | One synced skill, all surfaces | The only way to turn off a single synced skill everywhere |

## Inventory

### Group 1: Google Workspace connectors (deferred)

| Tool | Tools count | Decision | Note |
|------|-------------|----------|------|
| Gmail | 30 | Remove | Personal account; work mail is not here. Has send/trash tools (risk). |
| Google Calendar | 9 | Remove | Work calendar is not here. User to disconnect (still connected at time of audit). |
| Google Drive | 15 | Remove | User does not store working docs in Drive. |
| Google Sheets | 9 | Remove | Not used. |
| Google Slides | 4 | Remove | Not used. |

Follow-up: remove skill `google-workspace` in Group 6 (depends on these connectors).

### Group 2: Research and web connectors

| Tool | Load mode | Decision | Note |
|------|-----------|----------|------|
| Firecrawl | 8 fully loaded + 13 deferred | Remove | Heaviest connector in context; billed per credit. Replaced by built-in `WebSearch` + `web-fetch` agent. Only unique loss: GitHub issue/PR index search. |
| Claude Academy | deferred (3) | Keep-OnDemand | Read-only, near-zero cost. Anthropic courses (AI-native SDLC playbook, hooks as approval gates, CI/CD) match the AI-learning goal. |
| Mermaid Chart | deferred (1) | Keep-OnDemand | Validates/renders Mermaid for CI/CD and architecture docs; used by `devops-visual-docs`. |

### Group 3: GitHub and engineering plugin connectors

| Tool | Status | Decision | Note |
|------|--------|----------|------|
| GitHub (claude.ai connector) | deferred (~45) | Keep-OnDemand | Needed for branches, PRs, CI logs in cloud sessions. Scope repos via GitHub App (see below). |
| GitHub (engineering plugin) | failed to connect | Remove | Duplicate of the claude.ai connector; cannot work in repo-scoped cloud sessions. |
| Slack, Datadog, PagerDuty, Atlassian, Linear, Notion, Asana | need auth | Remove | Not used or not reachable: chat not connectable; Jira/Confluence on-prem; monitoring is Grafana/Prometheus; incidents in ServiceNow. |

Company stack (all internal, not reachable from cloud sessions):

| Category | Tool | Reachable from cloud |
|----------|------|----------------------|
| Chat | (not connectable) | No |
| Tracker / wiki | Jira / Confluence on-prem | No |
| Monitoring | Grafana + Prometheus | No (internal) |
| Incident | ServiceNow | No (internal) |
| Source control | GitLab + Bitbucket on-prem | No |

How to remove the plugin's MCP servers: the `engineering` plugin is synced from the claude.ai account (Anthropic catalog). Editing files in the cloud container is overwritten on next sync. Options:

1. Customize the plugin in the Claude desktop app (Cowork mode) with `cowork-plugin-customizer`: remove all 10 entries from `.mcp.json`, keep skills.
2. Uninstall the plugin (also removes its skills; see Group 4).

### GitHub access for other repositories

1. Connect GitHub at claude.ai (connect-github page).
2. Install the Claude GitHub App with **Only select repositories** (least privilege); add repos there as needed.
3. Pick repositories when starting a session. Mid-session, Claude can attach one with `add_repo` (read or push).
4. If a setup script needs a private repo: environment settings > Repositories, then start a new session with it selected.

### Local folders (GitLab/Bitbucket on-prem code, internal Grafana/Jira)

Cloud sessions cannot reach the internal network. Use the user's own machine:

- Run Claude Code locally (terminal or Claude desktop app) inside the repo folder. Best option for internal systems.
- Or share a folder through Remote Control: Claude desktop app > Settings > Claude Code > Remote Control, or run `claude remote-control` in the folder. A cloud session can then request that folder. Not allowed: home directory, hidden folders directly under home, `~/Library`.
- Internal MCP servers (e.g. Grafana) belong in the local Claude Code config, not in claude.ai connectors.

### Group 4: `engineering` plugin skills

architecture, code-review, debug, deploy-checklist, documentation, incident-response, standup, system-design, tech-debt, testing-strategy

Status: **pending lab results.** Evaluate on laptop-c with `labs/engineering-plugin-readonly/` (offline skills, then read-only MCP to Grafana/Jira/Confluence, HITL then AFK). Decision sheet: `labs/engineering-plugin-readonly/docs/08-evaluation.md`.

### Group 5: `mattpocock-skills` plugin

Decision: **Keep plugin** (Keep-Global). 25 skills declared; only 11 are model-invocable and cost context (~450 tokens/turn). The other 14 have `disable-model-invocation: true` (zero context cost, slash command only).

| Skill | Invocation | Fit | Note |
|-------|------------|-----|------|
| wizard | model | High | Bash wizard for human-only steps; CI-secret helper targets GitHub `gh` |
| grilling | model | High | Design-tree interview with recommended answers |
| writing-for-agents | model | High | Skills / CLAUDE.md authoring; context vs cognitive load |
| diagnosing-bugs | model | High | Feedback-loop-first; compare with `engineering:debug` in the lab |
| research | model | Medium-high | Background agent, primary sources, Markdown output |
| code-review | model | Medium | Standards + Spec axes; needs `/setup-matt-pocock-skills`; differs from built-in bug-focused `/code-review` |
| tdd | model | Medium | Seams agreed first; compare with `engineering:testing-strategy` |
| resolving-merge-conflicts | model | Medium | Risky defaults: commits automatically, never aborts |
| prototype | model | Low-medium | |
| domain-modeling | model | Low-medium | |
| codebase-design | model | Low | |
| teach, handoff, wait-what, grill-me | user-only | High/Medium | Zero context cost |
| to-spec, to-tickets, triage, wayfinder | user-only | Low | Need a reachable issue tracker (on-prem Jira is not) |

Practice guide: `labs/mattpocock-skills-practice/README.md`.

### Group 6: `anthropic-skills` (synced user skills)

Decisions:

| Skill | Chars/turn | Decision | Note |
|-------|-----------|----------|------|
| devops-visual-docs | 974 | Keep-Global | User-created. Main entry for diagrams |
| tech-doc-composer | 713 | Keep-Global | User-created. Main entry for documents |
| doc-classifier, doc-formatter, doc-visualizer | 1,797 | Keep, **shorten description** | User-created pipeline stages. See below |
| docx, pptx, xlsx | ~2,840 | Keep-Global | Not used yet; kept by user choice |
| pdf | 437 | Keep-Global | Vendor PDFs |
| built-in-browser, chrome-browser, computer-use | ~2,500 | Keep-Global | Used in the Claude desktop app. No tools for them in Claude Code cloud |
| skill-creator | 319 | Keep-Global | Skill authoring + evals |
| mcp-builder | 277 | Keep-Global | For internal MCP servers (e.g. ServiceNow) |
| google-workspace | 954 | Remove | Connectors removed in Group 1 |
| morning | 339 | Remove | Needs calendar/email/chat connectors; none reachable |
| canvas-design | 289 | Remove | Art/posters; diagrams are covered by devops-visual-docs |
| import-memory | 139 | Remove | One-time migration from another assistant; not needed |
| docs (Claude Docs) | 1,004 + connector (3 full tool schemas + long instructions) | Keep-Global | User choice: personal docs drafted on claude.ai and exported. **Never put company data in it** (personal account). Repo docs stay as Markdown files |
| deep-research | 570 | Pending (evaluation running) | Head-to-head vs `mattpocock-skills:research`: `labs/research-skills-eval/` |

#### Pipeline stages: why not user-only

`disable-model-invocation: true` blocks Claude from calling the skill through the Skill tool unless the user's own message contains `/<name>` (Claude Code skills docs). `tech-doc-composer` loads its stages itself, so user-only stages could break the pipeline.

Second problem: overlapping triggers. "format this document" triggers `doc-classifier`, "format this" / "make this a proper runbook" triggers `doc-formatter`, "create a runbook" triggers `tech-doc-composer`. One request can match three skills.

Fix: keep the stages model-invocable, but replace each description with a short pointer that names the pipeline stage and has no trigger keywords. `tech-doc-composer` and `devops-visual-docs` stay the only entry points.

| Skill | Before (chars) | After (chars) |
|-------|----------------|---------------|
| doc-classifier | 526 | 242 |
| doc-formatter | 608 | 193 |
| doc-visualizer | 663 | 220 |

Saved: ~1142 chars per turn, and no trigger collisions.

New frontmatter (keep the existing `metadata:` block unchanged):

`doc-classifier/SKILL.md`:

```yaml
name: doc-classifier
description: >
  Stage 1 of the tech-doc-composer pipeline: classify raw technical content into a doc_profile (type, audience, depth, suggested format). Use when tech-doc-composer runs this stage, or when the user only asks what kind of document something is.
```

`doc-formatter/SKILL.md`:

```yaml
name: doc-formatter
description: >
  Stage 2 of the tech-doc-composer pipeline: apply a layout template to raw content plus doc_profile, producing formatted_content and visualizer_hints. Use when tech-doc-composer runs this stage.
```

`doc-visualizer/SKILL.md`:

```yaml
name: doc-visualizer
description: >
  Stage 3 of the tech-doc-composer pipeline: turn visualizer_hints into Mermaid or HTML/SVG diagrams inside a formatted document; delegates DevOps diagrams to devops-visual-docs. Use when tech-doc-composer runs this stage.
```

Where to change: these are claude.ai-synced skills. Edit them on claude.ai where they were created. Edits under `~/.claude/skills/synced/` are not saved to the account and are overwritten by the next sync.

After the change, test: "make this a proper runbook: <notes>" should trigger only `tech-doc-composer`, and the composer must still run all three stages.

### Group 7: Built-in / repo / platform skills

everything-claude-code, add-language-rules, database-migration, feature-development, session-start-hook, cowork-plugin-management (2), dataviz, artifact-design, artifact-diagramming, artifact-capabilities, update-config, keybindings-help, code-review, simplify, fewer-permission-prompts, loop, claude-api, run, plugin-authoring, init, security-review

### Group 8: Platform tools (not removable)

claude-code-remote (session/env/trigger tools), Claude Docs, Artifact, core tools (Bash, Read, Edit, ...)

## Decisions log

(filled in group by group)

- Group 1: remove all Google Workspace connectors from Claude Code sessions. User does not use Google Workspace for work and does not keep docs in Drive.
- Group 2: remove Firecrawl; keep Claude Academy and Mermaid Chart as deferred (on-demand). Disconnect Google Calendar (left over from Group 1).
- Group 3: keep claude.ai GitHub connector (on-demand). Remove all MCP servers bundled with the `engineering` plugin (unused or unreachable). Internal systems are handled from the local machine.
- Group 4: deferred to the hands-on lab in `labs/engineering-plugin-readonly/`.
- Group 5: keep `mattpocock-skills`. Practice exercises in `labs/mattpocock-skills-practice/`; duplicates (code-review, tdd, diagnosing-bugs) decided together with Group 4 after the lab.
- Group 6: remove google-workspace, morning, canvas-design, import-memory. Keep the rest. Shorten the three pipeline-stage descriptions (not user-only: that would block the composer). Pending: docs, deep-research.
- Group 6 (follow-up): keep Claude Docs skill + connector for personal documents only. deep-research vs research evaluation delegated to a separate session; results in `labs/research-skills-eval/RESULTS.md`.
