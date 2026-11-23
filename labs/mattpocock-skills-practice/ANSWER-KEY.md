# Answer key

Read after doing the exercises.

## Exercise 2: grilling (`docs/plans/jenkins-to-gitlab-ci.md`)

Gaps a good grilling session should surface:

- Credentials: how secrets move from the Jenkins credential store to GitLab (masked/protected variables, external vault), and who rotates them.
- Production deploys: protected branches/environments, manual approval gates, who may trigger.
- Parallel run: both systems active per repo during migration; how to avoid double deploys from two webhooks.
- Rollback: how to return a repo to Jenkins if the GitLab pipeline fails.
- Inventory: 140 jobs, which are shared libraries, scheduled jobs, parameterised jobs, or jobs with no repo.
- Runner capacity and isolation: Kubernetes executor sizing, privileged builds (Docker-in-Docker), tenant isolation.
- Artifacts and caches: where build artifacts and caches live after migration.
- Success criteria and the Jenkins shutdown condition (not just "end of Q1").

## Exercise 4: diagnosing-bugs (`src/parse-alerts.js`)

- Bug 1: `alertKey` uses only `alertname`, so the same alert on `prod-01` and `prod-02` is merged into one entry (labelled with the first cluster). Fix: key on `alertname` + `cluster`.
- Bug 2: Alertmanager sends `endsAt: "0001-01-01T00:00:00Z"` for firing alerts. The code treats any non-empty `endsAt` as the end time, giving a large negative duration, which `Math.max(0, ...)` hides as `0`. Fix: treat `endsAt === ZERO_TIME` (or `status === "firing"`) as "still firing" and use `now`.
- A good loop: a `node:test` case using `fixtures/alerts-multi-cluster.json` with a fixed `now` (`2026-11-20T10:00:00Z`) asserting 3 entries and `maxDurationMin` 60 / 55 for the two NotReady alerts.

## Exercise 6: code-review (`feature/severity-filter` vs `main`)

Spec axis:

- R3 violated: unknown severities are dropped (`continue`) when `minSeverity` is set; the spec says treat them as `warning`.
- R4 at risk: the signature changed from `buildDigest(payload, now)` to `buildDigest(payload, options, now)`. Existing callers that pass `now` as the second argument now pass it as `options`.
- Scope creep: `colour` field and `colourFor()`; output formatting is explicitly out of scope.

Standards axis (`CONTRIBUTING.md`):

- Rule 2: `durationMinutes(alert, new Date())` reads the clock inside `src/`, ignoring the `now` argument.
- Rule 3: no tests added for the new behaviour.
- Rule 4: `alert.labels.severity` / `alert.labels.alertname` accessed repeatedly instead of through a helper.
- Smells: Primitive Obsession (severity as a string ranked by a lookup map in several places), Repeated Switches (two severity maps).
- Both planted bugs from Exercise 4 are still present (good reviewers mention them as pre-existing).

## Exercise 7: resolving-merge-conflicts (`config/thresholds.json`)

- Intent A (AI-7): raise global disk thresholds to 85/95 to cut noise.
- Intent B (ST-31): plant Hanoi must page at 88% because autogrow is disabled.
- Good resolution keeps both: global `diskUsageWarnPct: 85`, `diskUsageCritPct: 95`, and `overrides.plant-hanoi.diskUsageCritPct: 88`.
- Watch for: Hanoi's warn threshold now inherits 85, only 3 points below its critical 88. A careful agent flags this trade-off instead of silently deciding.
