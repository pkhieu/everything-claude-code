# Promtail Deprecation Status and End-of-Support Dates (as of November 2026)

## Is Promtail officially deprecated? In which Loki version and on what date was this announced?

### Takeaway
Yes. Grafana Labs officially deprecated Promtail in favour of Grafana Alloy with the Loki 3.4 release (3.4.0 dated 2025-02-12). The Loki 3.4 blog announcement was published 2025-02-14, and the LTS phase started 2025-02-13. As of November 2026, Promtail is past deprecation: it is end of life (EOL since 2026-03-02) and has been removed from the Loki repository.

### Cited Findings
- Loki 3.4 release notes: Promtail "is deprecated, as the code has been merged into Grafana Alloy". The notes add: "this deprecation does NOT include the lambda-promtail client." — [Loki v3.4 release notes](https://grafana.com/docs/loki/latest/release-notes/v3-4/)
- The Loki 3.4.0 changelog heading is dated 2025-02-12. — [Loki v3.4 release notes](https://grafana.com/docs/loki/latest/release-notes/v3-4/)
- The official Grafana Labs blog post "Grafana Loki 3.4: standardized storage config, sizing guidance, and Promtail merging into Alloy" was published 2025-02-14 by Julie Stickler. It says "we're taking the next step by deprecating Promtail and fully merging its capabilities into Alloy". — [Grafana Labs blog](https://grafana.com/blog/grafana-loki-3-4-standardized-storage-config-sizing-guidance-and-promtail-merging-into-alloy)
- The earlier docs banner (GEL v3.5.x Promtail page, now superseded) read: "Promtail is now deprecated and will enter into Long-Term Support (LTS) beginning Feb. 13, 2025." — [GEL v3.5.x Promtail docs](https://grafana.com/docs/enterprise-logs/v3.5.x/send-data/promtail/)
- **Conflicting statement:** the Loki 3.7 release notes say "Promtail was deprecated in Loki 3.0 and has been removed as of Loki 3.7.3". However, the Loki 3.0 release notes (3.0.0 dated 2024-04-08) mention Promtail only in bug fixes, with no deprecation or feature freeze. — [Loki v3.7 release notes](https://grafana.com/docs/loki/latest/release-notes/v3-7/); contradicted by [Loki v3.0 release notes](https://grafana.com/docs/loki/latest/release-notes/v3-0/) and [Loki v3.4 release notes](https://grafana.com/docs/loki/latest/release-notes/v3-4/)
- The Loki 3.4 release notes also note that Grafana Agent was deprecated, with LTS through October 31, 2025 and EOL on November 1, 2025. This is relevant context, since Alloy replaces both tools. — [Loki v3.4 release notes](https://grafana.com/docs/loki/latest/release-notes/v3-4/)

### Inferences
- The "deprecated in Loki 3.0" wording in the 3.7 notes is probably an editorial error. The 3.4 release notes, the 3.4 blog post and the LTS banner all consistently put the formal deprecation at Loki 3.4 in February 2025. Some informal "maintenance mode" messaging may have come earlier, but I found no official 3.0-era deprecation text.

### Gaps
- I did not find an official statement of an earlier "feature freeze" date separate from the LTS start of 2025-02-13. Under LTS there were "no new feature updates", so in effect the feature freeze coincides with LTS start.

## What are the official end-of-support / LTS / EOL dates? Do they apply to OSS, commercial support, or both?

### Takeaway
Official timeline:
- LTS began 2025-02-13: no new features; critical bug fixes and security fixes only.
- Commercial support ran through the LTS phase and ended 2026-02-28.
- EOL was 2026-03-02.

LTS and EOL cover the project as a whole (OSS and Grafana Enterprise Logs docs carry the same banner). The 2026-02-28 date applies specifically to commercial support.

### Cited Findings
- Original (now superseded) LTS banner, in Grafana's own wording: "Promtail will no longer receive any new feature updates, but it will receive critical bug fixes and security fixes. Commercial support will end after the LTS phase, which we anticipate will extend for about 12 months until February 28, 2026. End-of-Life (EOL) phase for Promtail will begin once LTS ends. Promtail is expected to reach EOL on March 2, 2026, afterwards no future support or updates will be provided." — [GEL v3.5.x Promtail docs](https://grafana.com/docs/enterprise-logs/v3.5.x/send-data/promtail/)
- The blog timeline gives LTS start as 2025-02-13 and EOL as 2026-03-02. During LTS, "commercial support, security updates, and critical fixes" continue. — [Grafana Labs blog](https://grafana.com/blog/grafana-loki-3-4-standardized-storage-config-sizing-guidance-and-promtail-merging-into-alloy)
- Current (latest) Loki docs say: "Promtail is end of life (EOL) as of March 2, 2026." and "Commercial support has ended." — [Loki latest Promtail docs](https://grafana.com/docs/loki/latest/send-data/promtail/)
- Alloy migration docs say: "Promtail reached end of life (EOL) on March 2, 2026 and is no longer maintained." — [Alloy: Migrate from Promtail](https://grafana.com/docs/alloy/latest/set-up/migrate/from-promtail/)

### Inferences
- The dates projected in February 2025 ("anticipate", "expected") were confirmed in practice. The current docs state the EOL of 2026-03-02 as fact, and I found no sign of an extension.

### Gaps
- I found no official, separate OSS-versus-commercial date table. The only split is "commercial support" ending 2026-02-28, versus the EOL of 2026-03-02 applying to all updates.

## What happens after EOL (security fixes, bug fixes, releases, repository status)?

### Takeaway
After 2026-03-02 there is no support and there are no updates of any kind (no security or bug fixes, no releases). Users "must migrate to Alloy or another supported client". All feature development happens in Alloy. lambda-promtail is explicitly excluded from the deprecation.

### Cited Findings
- After EOL, "no future support or updates will be provided"; "All future feature development will occur in Grafana Alloy." — [GEL v3.5.x Promtail docs](https://grafana.com/docs/enterprise-logs/v3.5.x/send-data/promtail/); [Loki latest Promtail docs](https://grafana.com/docs/loki/latest/send-data/promtail/)
- The current docs say: "If you are currently using Promtail, you must migrate to Alloy or another supported client." They also say: "the deprecation of Promtail does NOT include the lambda-promtail client." — [Loki latest Promtail docs](https://grafana.com/docs/loki/latest/send-data/promtail/)
- Alloy provides a utility that converts Promtail configuration to Alloy configuration. — [Loki v3.7 release notes](https://grafana.com/docs/loki/latest/release-notes/v3-7/); [Alloy: Migrate from Promtail](https://grafana.com/docs/alloy/latest/set-up/migrate/from-promtail/)

### Inferences
- Existing Promtail binaries and images from earlier releases probably keep working against Loki for now. They get no fixes, though, so any CVE in Promtail or its dependencies will stay unpatched.

### Gaps
- I found no official statement on whether old Promtail Docker images (for example grafana/promtail on Docker Hub) or the standalone grafana/promtail Helm chart have been removed or archived.

## Has anything changed since the original announcement (code removal, final release)?

### Takeaway
Yes. After EOL, Grafana removed the Promtail source code and binaries from the Loki repo. This was done in PR #21245 on main and backported to the 3.7 line as PR #21248, merged 2026-03-25. The Loki 3.7 docs say Promtail "has been removed as of Loki 3.7.3" (released 2026-06-24). Separately, the Loki Helm chart moved to grafana-community/helm-charts effective 2026-03-16. Current Loki releases as of November 2026 are v3.7.10 (latest stable, 13 Nov) and v4.0.0 release candidates (rc.4 on 20 Nov), none of which ship Promtail.

### Cited Findings
- PR #21248 "feat: Remove Promtail support (backport k299)" was merged 2026-03-25, backporting #21245 (commit 572df01). The author wrote: "Promtail reached EOL on March 2, so in this PR I'm removing its source code from this repo", adding that "Promtail binaries shouldn't be available anymore". Some Promtail API code remains because other clients, such as Fluent Bit, depend on it. — [grafana/loki PR #21248](https://github.com/grafana/loki/pull/21248)
- The v3.7.3 changelog (2026-06-24) lists "Remove Promtail support (backport k299)" (#21248) under Features. — [Loki v3.7.3 release](https://github.com/grafana/loki/releases/tag/v3.7.3)
- The Loki 3.7 release notes say "removed as of Loki 3.7.3; the code has been merged into Grafana Alloy"; "this removal does NOT include the lambda-promtail client." 3.7.0 is dated 2026-03-26. — [Loki v3.7 release notes](https://grafana.com/docs/loki/latest/release-notes/v3-7/)
- The `clients/cmd` directory on grafana/loki main shows docker-driver, fluent-bit, fluentd and logstash, but no promtail. Caveat: the listing may be truncated. — [grafana/loki clients/cmd](https://github.com/grafana/loki/tree/main/clients/cmd)
- Release list as of November 2026: v3.7.10 (13 Nov, Latest), v3.6.22 (18 Nov), v4.0.0-rc.4 (20 Nov, pre-release). — [grafana/loki releases](https://github.com/grafana/loki/releases)
- The Loki Helm chart was forked to grafana-community/helm-charts effective March 16, 2026. After that date, the chart in the Loki repo is maintained for GEL users only. — [Loki docs: upgrade to community Helm chart](https://grafana.com/docs/loki/latest/setup/upgrade/upgrade-to-community/); [grafana/loki issue #20705](https://github.com/grafana/loki/issues/20705)

### Inferences
- The last Loki release line to include Promtail is v3.7.2 or earlier, or the 3.6.x line. The 3.6.x branch is still receiving patches (v3.6.22). I could not confirm whether those patches still build Promtail.
- There is a discrepancy. The backport merged into the 3.7 branch on 2026-03-25, one day before 3.7.0 (2026-03-26), yet the changelog and docs credit the removal to 3.7.3. The backport may have landed after the 3.7.0 cut. The report writer should cite "removed as of Loki 3.7.3" per the official docs.

### Gaps
- I could not confirm the exact final Loki version that shipped Promtail binaries or images. GitHub API access was unavailable, and the release asset lists were collapsed.
- I could not confirm whether the 3.6.x patch releases still publish Promtail artifacts.
- I found no official statement on the fate of the standalone promtail Helm chart.
