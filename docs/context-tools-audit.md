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

### Group 5: `mattpocock-skills` plugin

diagnosing-bugs, tdd, prototype, research, domain-modeling, codebase-design, code-review, resolving-merge-conflicts, wizard, grilling, writing-for-agents (+ ~30 more skills installed in the plugin)

### Group 6: `anthropic-skills` (synced user skills)

- Doc pipeline: doc-classifier, doc-formatter, doc-visualizer, tech-doc-composer, devops-visual-docs
- Office files: docx, pptx, xlsx, pdf, google-workspace, docs
- Browser/desktop: built-in-browser, chrome-browser, computer-use
- Other: canvas-design, deep-research, import-memory, mcp-builder, morning, skill-creator

### Group 7: Built-in / repo / platform skills

everything-claude-code, add-language-rules, database-migration, feature-development, session-start-hook, cowork-plugin-management (2), dataviz, artifact-design, artifact-diagramming, artifact-capabilities, update-config, keybindings-help, code-review, simplify, fewer-permission-prompts, loop, claude-api, run, plugin-authoring, init, security-review

### Group 8: Platform tools (not removable)

claude-code-remote (session/env/trigger tools), Claude Docs, Artifact, core tools (Bash, Read, Edit, ...)

## Decisions log

(filled in group by group)

- Group 1: remove all Google Workspace connectors from Claude Code sessions. User does not use Google Workspace for work and does not keep docs in Drive.
- Group 2: remove Firecrawl; keep Claude Academy and Mermaid Chart as deferred (on-demand). Disconnect Google Calendar (left over from Group 1).
- Group 3: keep claude.ai GitHub connector (on-demand). Remove all MCP servers bundled with the `engineering` plugin (unused or unreachable). Internal systems are handled from the local machine.
