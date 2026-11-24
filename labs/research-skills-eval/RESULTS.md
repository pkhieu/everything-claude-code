# Research skills evaluation: `deep-research` (DR) vs `mattpocock-skills:research` (MR)

**Date:** 2026-11-24
**Brief:** [HANDOFF-PROMPT.md](HANDOFF-PROMPT.md)
**Raw outputs:** [outputs/](outputs/) (`outputs/<task>/<DR|MR>/`, unedited)

## How the runs were done

- **DR** was invoked through the Skill tool as `anthropic-skills:deep-research` (the org-synced copy). It asked no
  follow-up questions in any task. It used 2 to 4 research subagents plus one report writer per task.
- **MR** was not installed in this session (`Unknown skill: mattpocock-skills:research`). Its `SKILL.md` was read
  from `mattpocock/skills` (commit `abeeaf9`, plugin v1.3.2). It is a 3-step instruction: spawn one background
  agent with a fresh context, research primary sources only, write one cited Markdown file where the repo keeps
  notes. That was reproduced exactly: one background `general-purpose` agent got the verbatim question plus the
  skill's three steps. See Caveats.
- Order alternated as required: T1, T3, T5 ran DR first; T2, T4 ran MR first. No output was read before both runs
  of a task finished. During each MR run, earlier outputs were moved out of the repo so the agent could not read them.
- **Cost:** `get_session` exposes no `usage.cost_usd` in this environment, so cost is reported as subagent tokens
  (from each agent's usage record). DR's coordinator tokens in the main session are not included, so DR is
  slightly understated.
- **Citation check:** 3 cited claims per output, picked with a seeded random sample (`random.seed(2026)`) over
  lines that carry a citation, then checked against a fresh fetch of the cited page or file.
- **Correctness:** checked independently against primary sources fetched today (Grafana docs, a `git ls-tree` of
  Loki tags, the Kubernetes official CVE feed JSON, the Deprecated API Migration Guide, CHANGELOG-1.31/1.33,
  upstream READMEs, PyPI/npm registries, the Atlassian Marketplace API).

Primary-source share counts official docs, vendor/project sites and docs, source repos, package registries,
CVE/NVD/GitHub advisories. MR mostly cites repo paths, commits and keyed source lists rather than URLs, so for MR
"sources cited" counts distinct entries in its source list.

## T1: Promtail deprecation (single fact with dates)

| Metric | DR | MR |
|---|---|---|
| Wall time (min) | 5.4 | 3.1 |
| Cost | n/a (307k subagent tokens) | n/a (96k tokens) |
| Questions asked | 0 | 0 |
| Sources cited | 24 URLs | 9 sources (5 URLs + Loki commits/tags) |
| Primary-source share | 100% | 100% |
| Citation check (0-3) | 3 | 3 |
| Correctness (0-2) | 1 | 2 |
| Freshness (0-2) | 2 | 2 |
| Actionability (0-2) | 2 | 2 |
| Length (words) | 1,825 (+3,932 in notes) | 1,319 |
| Output form | `reports/<Title>.md` + 2 notes files, spaces in names | 1 kebab-case file in `research/` |

- Both have the official dates right: LTS 2025-02-13, commercial support end 2026-02-28, EOL 2026-03-02.
- DR repeats Grafana's release-notes claim that Promtail was removed in Loki **3.7.3**. MR checked the tags: the
  code is in `v3.6.10` and gone in `v3.7.0`. I confirmed with `git ls-tree` on both tags, so MR is right.
- MR was faster, smaller and more precise. It verified a fact against source code instead of trusting the docs.

## T2: Argo CD vs Flux (comparison for a decision)

| Metric | DR | MR |
|---|---|---|
| Wall time (min) | 6.5 | 5.8 |
| Cost | n/a (566k tokens) | n/a (123k tokens) |
| Questions asked | 0 | 0 |
| Sources cited | 51 URLs | 9 upstream repos pinned to tag/commit, cited by file and line |
| Primary-source share | 96% | 100% |
| Citation check (0-3) | 3 | 3 |
| Correctness (0-2) | 2 | 2 |
| Freshness (0-2) | 2 | 2 |
| Actionability (0-2) | 2 | 2 |
| Length (words) | 2,545 (+10,897 in notes) | 2,598 |
| Output form | report + 4 notes files | 1 file in `research/` |

- **The verdicts are opposite.** DR recommends Flux (per cluster, Flux Operator), and Argo CD only if a shared SSO
  UI is the top need. MR recommends Argo CD by default, and Flux if tenants work only through GitLab MRs or no hub
  may hold all cluster credentials.
- The facts agree and were verified: Argo CD bundles Dex, sync impersonation is beta since v3.5.0, Flux has an
  official air-gapped guide, and Flux has a `gitlabmergerequestcomment` provider. The difference is how each weights
  "self-service UI with AD login" against "air gap and no central credentials". Both state their conditions clearly.
- For a decision task, either output alone would steer the user. Reading both was more useful than either one.

## T3: ingress-nginx CVEs (security and freshness)

| Metric | DR | MR |
|---|---|---|
| Wall time (min) | 7.4 | 6.3 |
| Cost | n/a (505k tokens) | n/a (130k tokens) |
| Questions asked | 0 | 0 |
| Sources cited | 38 URLs | 18 sources (CVE feed, 13 advisories, 2 blog posts, repo, VAP docs) |
| Primary-source share | 84% | 100% |
| Citation check (0-3) | 3 | 3 |
| Correctness (0-2) | 2 | 2 |
| Freshness (0-2) | 2 | 2 |
| Actionability (0-2) | 2 | 2 |
| Length (words) | 2,248 (+7,109 in notes) | 2,584 |
| Output form | report + 3 notes files | 1 file in `research/` |

- Both list the same 9 Critical/High CVEs with the same fixed versions. This matches the official Kubernetes CVE
  feed exactly, including the "8.8 (Medium)" label error on CVE-2026-4342 and the retirement (last release v1.15.1,
  repo archived March 2026).
- MR built the CVE list from the official feed JSON and the advisories' embedded OSV data, which is the most
  reliable method. DR also cites vendor blogs (Wiz, Sysdig, Aikido, HeroDevs) and flags the vendor claims as unverified.
- DR adds detection material (a Falco rule) and a mapping from annotation risk levels to CVEs. MR adds computed
  CVSS scores for advisories that give only a vector.

## T4: Kubernetes 1.30 to 1.33 API removals and kubeadm (primary-source API facts)

| Metric | DR | MR |
|---|---|---|
| Wall time (min) | 6.7 | 5.1 |
| Cost | n/a (572k tokens) | n/a (154k tokens) |
| Questions asked | 0 | 0 |
| Sources cited | 26 URLs | 12 sources (3 changelogs, migration guide, 4 upgrade pages, v1beta4 reference, 3 blog posts) |
| Primary-source share | 100% | 100% |
| Citation check (0-3) | 3 | 3 |
| Correctness (0-2) | 2 | 2 |
| Freshness (0-2) | 2 | 2 |
| Actionability (0-2) | 2 | 2 |
| Length (words) | 2,405 (+8,599 in notes) | 2,298 |
| Output form | report + 3 notes files | 1 file in `research/` |

- Same core answer from both, and it is correct: the only beta/GA API removed is
  `flowcontrol.apiserver.k8s.io/v1beta3` in v1.32. The migration guide has no v1.31 or v1.33 section. etcd must be
  at least 3.5.11 from kubeadm 1.31, and kube-apiserver `--cloud-provider`/`--cloud-config` are removed in 1.33.
- MR diffed the kubeadm upgrade page across the `release-1.30..1.33` website branches and showed the procedure did
  not change. I verified the 1.33 typo fix. DR adds a useful conclusion: removed flags and feature gates in kubeadm
  `extraArgs` break upgrades more often than removed APIs do.

## T5: MCP servers for Grafana, Jira/Confluence DC, ServiceNow (niche landscape)

| Metric | DR | MR |
|---|---|---|
| Wall time (min) | 6.5 (after a rate-limit restart) | 7.4 |
| Cost | n/a (452k tokens) | n/a (150k tokens) |
| Questions asked | 0 | 0 |
| Sources cited | 41 URLs | 54 URLs |
| Primary-source share | 95% | 100% |
| Citation check (0-3) | 2 | 3 |
| Correctness (0-2) | 2 | 1 |
| Freshness (0-2) | 2 | 2 |
| Actionability (0-2) | 2 | 2 |
| Length (words) | 2,401 (+7,323 in notes) | 2,563 |
| Output form | report + 3 notes files | 1 file in `research/` |

- Both agree on the main points, and they are correct: `grafana/mcp-grafana` v2.3.0 with `--disable-write`; no
  official Jira/Confluence DC server; `sooperset/mcp-atlassian` v0.24.8 with `READ_ONLY_MODE`; ServiceNow MCP Server
  Console with OAuth authorization code only.
- **MR missed part of the landscape.** It says only one community ServiceNow server is maintained. DR found three
  more that are maintained and have real read-only modes: `jschuller/mcp-server-servicenow` (PyPI 0.9.3,
  2026-10-29) and `IvanBBaev/servicenow-mcp-ai` (npm 3.1.1, 2026-10-31), both confirmed in the registries, and
  `Xerrion/servicenow-platform-mcp`. On a "landscape" question that is the key fact for the user.
- In DR's citation check, one sampled claim cites a Brazil docs page for "Now Assist must be activated". That
  requirement is on the Zurich release-notes page instead, so it scored 0. MR had the newer Happy Technologies
  version (v7.0.3, verified with `git ls-remote`) where DR's notes were unsure.

## Summary across tasks

| Metric | DR | MR |
|---|---|---|
| Wall time, total (avg) | 32.5 min (6.5) | 27.7 min (5.5) |
| Cost | n/a | n/a |
| Subagent tokens, total (avg) | 2,401k (480k) | 652k (130k) |
| Questions asked, total | 0 | 0 |
| Sources cited, avg | 36 URLs | 20 sources (often commit/file-level) |
| Primary-source share, avg | 95% | 100% |
| Citation check, total | 14/15 | 15/15 |
| Correctness, total | 9/10 | 9/10 |
| Freshness, total | 10/10 | 10/10 |
| Actionability, total | 10/10 | 10/10 |
| Length, avg words (final file) | 2,285 (+7,572 in notes) | 2,272 |
| Output files per run | 3 to 5, `reports/` + `research_notes/` in the repo root, spaces in names | 1, kebab-case, in the repo's existing `research/` folder |
| Always-loaded description | ~570 chars | ~240 chars |

## Recommendation

**Keep MR in the always-loaded context. Do not keep DR always loaded.**

- **Quality is a tie.** Correctness 9 vs 9, freshness 10 vs 10, actionability 10 vs 10, citations 14 vs 15. Each
  skill had one wrong key fact (DR on T1, MR on T5).
- **MR is about 3.7x cheaper** (652k vs 2.4M subagent tokens across 5 tasks) and about 15% faster (5.5 vs 6.5 min
  per task). It also runs in the background, so the main session stays free while it works.
- **MR's output fits a repo.** It writes one file into the existing `research/` folder with a kebab-case name. DR
  writes 3 to 5 files with spaces in their names into new `reports/` and `research_notes/` folders in the working
  directory, which then have to be moved and renamed.
- **MR's context cost is lower:** about 240 characters on every turn, vs about 570 for DR, which saves about 330
  characters per turn.
- **Where DR is worth invoking on demand:** broad landscape or survey questions with many independent entities (T5),
  where splitting the work across parallel researchers found items one agent missed. It also helps on decision
  questions (T2), where a second, independently weighted view is valuable. For those, call it explicitly. It does
  not need to sit in every turn's context.
- If DR cannot be removed from the always-loaded set (it is an org-synced skill), the evidence still says to use MR
  by default and DR only for landscape questions.

## Caveats

1. **MR was emulated, not installed.** The run follows its `SKILL.md` exactly, but the spawn prompt was my wording.
   An installed MR could phrase the agent prompt differently.
2. **I was DR's coordinator.** DR's design has the coordinator write detailed researcher prompts. Mine drew on my
   own knowledge and named specific items (for example IngressNightmare, `READ_ONLY_MODE`, `sooperset/mcp-atlassian`,
   the Flux Operator). That is how DR works, but it gave DR's researchers hints that MR's single agent did not get.
   MR received only the verbatim question.
3. **Same model everywhere.** The researchers, the report writers and the evaluator were all the same model, so
   evaluator bias is possible. The correctness checks used fetched primary data to limit this.
4. **The harness ignored `run_in_background=false`.** DR's "foreground" subagents ran asynchronously, and the
   coordinator waited on notifications. Wall times include that orchestration overhead.
5. **Rate limit.** The first T5 DR attempt failed with HTTP 429 (5-hour limit) before any research ran. T5 DR wall
   time is measured from the restart.
6. **No dollar cost.** `cost_usd` was not available, so tokens are a proxy. DR's coordinator tokens in the main
   session are not counted.
7. **Leakage.** The T5 MR agent found `HANDOFF-PROMPT.md` in the repo and noted that it might be part of this
   evaluation. It could not see other outputs, which were held outside the repo during MR runs.
8. **Different evidence styles.** The GitHub API was blocked for both skills. MR's agents cloned repos and cited
   commits and file lines, while DR's researchers mostly fetched web pages. "Sources cited" is therefore not
   comparable one-to-one.
9. **Small sample.** Five tasks, one run each, so there is no measure of run-to-run variance. The T2 verdict flip
   suggests that variance on judgement questions is large.
10. **Temporary files.** Both skills wrote outside `labs/` during runs (DR: `reports/` and `research_notes/` in the
    repo root; MR: `research/`). Every file was moved into `outputs/`, and nothing remains outside
    `labs/research-skills-eval/`.

## Run log

| Run | Start (UTC) | End (UTC) | Subagent tokens | DR researchers |
|---|---|---|---|---|
| T1 DR | 04:31:48 | 04:37:09 | 306,798 | 2 |
| T1 MR | 04:37:19 | 04:40:22 | 96,076 | - |
| T2 MR | 04:40:22 | 04:46:08 | 122,893 | - |
| T2 DR | 04:46:15 | 04:52:45 | 565,641 | 4 |
| T3 DR | 04:52:45 | 05:00:11 | 505,294 | 3 |
| T3 MR | 05:00:11 | 05:06:31 | 129,503 | - |
| T4 MR | 05:06:37 | 05:11:43 | 154,262 | - |
| T4 DR | 05:11:48 | 05:18:27 | 571,782 | 3 |
| T5 DR | 05:24:47 (restart) | 05:31:15 | 451,962 | 3 |
| T5 MR | 05:31:15 | 05:38:40 | 149,638 | - |
