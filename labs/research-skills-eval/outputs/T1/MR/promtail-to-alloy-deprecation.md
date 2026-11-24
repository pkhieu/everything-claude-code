# Promtail Deprecation and Migration to Grafana Alloy

**Date:** 2026-11-24
**Question:** Is Promtail deprecated in favour of Grafana Alloy? What are the official end-of-support dates and the official migration path?
**Sources:** Grafana's documentation and the `grafana/loki` and `grafana/alloy` Git repositories. Commit hashes and dates below come from a local clone of each repo, made on 2026-11-24.

## Short Answer

- **Yes.** Grafana deprecated Promtail in favour of Grafana Alloy. Grafana's stated reason is that Promtail's code "has been merged into Grafana Alloy" [S3, S4].
- **Dates** (as Grafana announced them on 2025-02-12 [S1]):
  - LTS (critical bug and security fixes only) started on **Feb 13, 2025**.
  - Commercial support ended on **February 28, 2026**.
  - EOL was on **March 2, 2026**.
- **EOL has happened.** The current docs say Promtail "is end of life (EOL) as of March 2, 2026" [S2, S6].
- **Removed from Loki.** The Promtail source was taken out of the Loki repository on 2026-03-25 (PR #21245 on `main`, backport #21248) [S7]. Loki v3.7.0 does not include it [S8].
- **Migration path.** Use Grafana Alloy's built-in converter: `alloy convert --source-format=promtail`. For a temporary transition you can instead run `alloy run --config.format=promtail` [S6].
- **Exception.** `lambda-promtail` is not covered by the deprecation [S2, S3, S4].

## 1. Deprecation Announcement

Grafana added a deprecation banner to the Promtail docs page in commit `b8b3ed178` ("docs: adding Promtail deprecation banners (#16227)", 2025-02-12). The banner reads [S1]:

> Promtail is now deprecated and will enter into Long-Term Support (LTS) beginning Feb. 13, 2025. This means that Promtail will no longer receive any new feature updates, but it will receive critical bug fixes and security fixes. Commercial support will end after the LTS phase, which we anticipate will extend for about 12 months until February 28, 2026. End-of-Life (EOL) phase for Promtail will begin once LTS ends. Promtail is expected to reach EOL on March 2, 2026, afterwards no future support or updates will be provided. All future feature development will occur in Grafana Alloy.

The deprecation is also listed under "Deprecations" in the release notes for Loki 3.4, 3.5 and 3.6 [S3]:

> Promtail is deprecated, as the code has been merged into Grafana Alloy. You can find migration documentation and a utility to convert your Promtail configuration to Alloy configuration in the Alloy documentation. Note that this deprecation does NOT include the lambda-promtail client.

The 3.6 release notes add: "Commercial support will end February 28, 2026." [S3]

## 2. Official Lifecycle Dates

| Phase | Date | Source |
|-------|------|--------|
| Deprecated; LTS begins (critical bug and security fixes only) | Feb 13, 2025 | S1 |
| Commercial support ends | Feb 28, 2026 | S1, S3 (v3.6 notes) |
| End of Life (no further support or updates) | Mar 2, 2026 | S1, S2, S6 |
| Promtail source removed from `grafana/loki` `main` (PR #21245) | 2026-03-25 (commit date) | S7 |
| First Loki release without Promtail | v3.7.0, tagged 2026-03-26 | S8 |
| Promtail docs page deleted from `main` (PR #26115) | 2026-11-02 (commit date) | S7 |

The post-EOL banner on the Loki docs page (commit `0056986db`, 2026-04-02) reads [S2]:

> Promtail is end of life (EOL) as of March 2, 2026. Commercial support has ended. No future support or updates will be provided. All future feature development will occur in Grafana Alloy.
> Note that the deprecation of Promtail does NOT include the lambda-promtail client.
>
> If you are currently using Promtail, you must migrate to Alloy or another supported client.

## 3. Removal from the Loki Codebase

- Commit `572df0168` ("feat: Remove Promtail support (#21245)", 2026-03-25) deleted 106 files and 10,124 lines [S7]. The deleted files include:
  - `clients/cmd/promtail/`
  - `production/helm/promtail`
  - `production/ksonnet/promtail`
  - the systemd and packaging files under `tools/packaging/promtail*`
  - most of the Promtail docs under `docs/sources/send-data/`
- The backport commit `939d15f1a` ("feat: Remove Promtail support (backport k299) (#21248)") is an ancestor of the `v3.7.0` tag. `clients/cmd/promtail` exists in `v3.6.0` and `v3.6.10`, but not in `v3.7.0`, `v3.7.2` or `v3.7.3` [S8]. The 3.6.x release line still includes Promtail.
- Current `clients/cmd/` on `main` contains only `docker-driver`, `fluent-bit`, `fluentd` and `logstash` [S8].

## 4. Official Migration Path

Grafana's Loki docs send Promtail users to "Migrate to Alloy" [S5]. That page links to the Alloy guide "Migrate from Promtail to Grafana Alloy" [S6]. The guide states: "Promtail reached end of life (EOL) on March 2, 2026 and is no longer maintained." [S6] It describes two options.

### Option A: convert the configuration (recommended permanent path) [S6]

```bash
alloy convert --source-format=promtail --output=<OUTPUT_CONFIG_PATH> <INPUT_CONFIG_PATH>
```

- `--bypass-errors` produces a best-effort conversion despite non-critical issues. The docs warn that the converted behaviour "may not match the original Promtail configuration."
- `--report=<OUTPUT_REPORT_PATH>` writes a diagnostic report.
- After converting, run Alloy with the generated configuration.

The converter is part of the Alloy source, under `internal/converter/internal/promtailconvert/` in `grafana/alloy` [S9].

### Option B: run Alloy on the Promtail config directly (temporary transition) [S6]

```bash
alloy run --config.format=promtail <PROMTAIL_CONFIG>
```

- This converts the Promtail configuration and loads it without saving the converted file.
- `--config.bypass-conversion-errors` starts Alloy even when there are conversion errors. The docs advise against using it in production.

### Known caveats from the official guide [S6]

- Promtail tracing configuration "cannot be migrated to Alloy automatically" and must be set up again by hand.
- The positions file is saved in a different location. Update any persistent storage that holds it, such as a Kubernetes Persistent Volume.
- Meta-monitoring metric names differ, so dashboards and alerts need updating. Logs and the web UI also differ from Promtail's.
- CLI flags (for example `-max-line-size`) and environment variables are not converted. Check them manually.
- The converter assumes that Kubernetes `pod` discovery means a DaemonSet deployment. Other deployment types may need manual edits to `discovery.kubernetes`.
- You can use the systemd journal source (`loki.source.journal`) only if the `alloy` user is in the `adm` and `systemd-journal` groups.

## 5. Discrepancies in the Official Sources

- **Deprecation version.** The Loki 3.7 release notes say "Promtail was deprecated in Loki 3.0 and has been removed as of Loki 3.7.3 (#21248)" [S3]. Neither claim matches the repository:
  - The deprecation notice first appears in the 3.4 release notes and in the Feb 2025 docs banner [S1, S3]. The 3.0 to 3.3 notes do not include it.
  - The removal commit #21248 is already in `v3.7.0`, not only in 3.7.3 [S8].
- **Release-note date typo.** The v3.6 notes date "3.6.9" as 2025-04-01. It appears among 2026 entries and mentions Go 1.25.8, so the year is most likely 2026 [S3].
- **Docs page removed.** The Loki docs page that carries the EOL banner was deleted from `main` on 2026-11-02 (#26115) [S7]. The published "latest" page was still live when checked on 2026-11-24 [S2]. Later versions of the Loki docs may not include it, but the Alloy migration guide remains [S6].

## Related Context

Grafana Agent (Static, Flow and Operator) is also deprecated in favour of Alloy. It "reached End-of-Life (EOL) on November 1, 2025" [S5].

## Sources

- **S1:** Loki repo, commit `b8b3ed1784f936d7903382694679db11a246e6ca` (2025-02-12), `docs/sources/send-data/promtail/_index.md`. Contains the deprecation and LTS banner.
- **S2:** Loki docs, "Promtail agent": https://grafana.com/docs/loki/latest/send-data/promtail/ (fetched 2026-11-24). Matches commit `0056986db417392c04deeb61e5f85a8c37ef0187` (2026-04-02).
- **S3:** Loki release notes in the repo: `docs/sources/release-notes/v3-4.md`, `v3-5.md`, `v3-6.md` and `v3-7.md` on `main`. The published version is at https://grafana.com/docs/loki/latest/release-notes/
- **S4:** Loki 3.4 release notes: https://grafana.com/docs/loki/latest/release-notes/v3-4/
- **S5:** Loki docs, "Migrate to Alloy": https://grafana.com/docs/loki/latest/setup/migrate/migrate-to-alloy/
- **S6:** Alloy docs, "Migrate from Promtail to Grafana Alloy": https://grafana.com/docs/alloy/latest/set-up/migrate/from-promtail/. The source file is `docs/sources/set-up/migrate/from-promtail.md` in `grafana/alloy` on `main`.
- **S7:** Loki repo commits:
  - `572df0168ff92c9f6e1b03457682093faf5de39f`: "feat: Remove Promtail support (#21245)"
  - `0056986db`: "docs: add back promtail topic with migration links (#21378)"
  - `2550fb6cf9b92ea67514dc9849d1b1b134bba512`: "docs: Delete promtail and logstash files (#26115)"
- **S8:** Loki repo tags `v3.6.0`, `v3.6.10`, `v3.7.0` (2026-03-26), `v3.7.2` and `v3.7.3`. Checked with `git ls-tree <tag> clients/cmd/` and `git merge-base --is-ancestor 939d15f1a v3.7.0`.
- **S9:** Alloy repo `main`, `internal/converter/internal/promtailconvert/`.
