# Ingress-NGINX (kubernetes/ingress-nginx): Critical/High CVEs disclosed in 2026 and project lifecycle status (as of 24 Nov 2026)

Scope: only the community controller `kubernetes/ingress-nginx`, not F5/NGINX Inc's `nginx-ingress`. Official Kubernetes advisories are filed as issues in `kubernetes/kubernetes` with the `official-cve-feed` label. I enumerated them with a GitHub search for `ingress-nginx` advisories created on or after 2026-01-01 (labels `official-cve-feed` and `area/security`). That search returned 8 advisories in total, 5 of them High.

## Which Critical/High CVEs were disclosed in 2026 and which versions fix them?

### Takeaway
Five High-severity (CVSS 3.1 8.8) ingress-nginx CVEs were disclosed in 2026, and none were Critical. All five are nginx configuration-injection bugs that can lead to code execution in the controller and disclosure of Secrets. They came in three waves (2 Feb, 6 Feb and 9 Mar, then 19 Mar 2026). The last fixed releases are controller v1.13.9, v1.14.5 and v1.15.1, with Helm charts 4.13.9, 4.14.5 and 4.15.1. A Low CVE disclosed on 5 Nov 2026, after retirement, was marked won't-fix.

### Inventory: High CVEs (official Kubernetes advisories)

| CVE | CVSS 3.1 | Summary | Affected | Fixed controller (Helm chart) | Disclosed | Advisory |
|---|---|---|---|---|---|---|
| CVE-2026-24512 | 8.8 HIGH (AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H) | `rules.http.paths.path` Ingress field can inject nginx config; leads to RCE in the controller and disclosure of Secrets (in a default install the controller can read all cluster Secrets). Mitigation: reject `ImplementationSpecific` pathType. Reported by Michelin CERT. | < v1.13.7, < v1.14.3 | v1.13.7 (4.13.7), v1.14.3 (4.14.3) | 2 Feb 2026 | https://github.com/kubernetes/kubernetes/issues/136678 |
| CVE-2026-1580 | 8.8 HIGH (same vector) | `nginx.ingress.kubernetes.io/auth-method` annotation config injection, leading to RCE and Secrets disclosure. Reported by Volcengine Security Team. | < v1.13.7, < v1.14.3 | v1.13.7 (4.13.7), v1.14.3 (4.14.3) | 2 Feb 2026 | https://github.com/kubernetes/kubernetes/issues/136677 |
| CVE-2025-15566 (2025 ID, disclosed 2026) | 8.8 HIGH (same vector) | `nginx.ingress.kubernetes.io/auth-proxy-set-headers` annotation config injection, leading to RCE and Secrets disclosure | < v1.12.5, < v1.13.1 | v1.12.5, v1.13.1 (chart versions not stated in advisory) | 6 Feb 2026 | https://github.com/kubernetes/kubernetes/issues/136789 |
| CVE-2026-3288 | 8.8 HIGH (same vector) | `nginx.ingress.kubernetes.io/rewrite-target` annotation config injection, leading to RCE and Secrets disclosure. Mitigation: block the annotation through admission control. Reported by Kai Aizen. | < 1.13.8, < 1.14.4, < 1.15.0 | v1.13.8 (4.13.8), v1.14.4 (4.14.4), v1.15.0 (4.15.0) | 9 Mar 2026 | https://github.com/kubernetes/kubernetes/issues/137560 |
| CVE-2026-4342 | 8.8 (issue text says "8.8 (Medium)"; NVD says HIGH) | "Comment-based" config injection through a combination of Ingress annotations, leading to RCE and Secrets disclosure. Reported by wooseokdotkim. | < v1.13.9, < v1.14.5, < v1.15.1 | v1.13.9 (4.13.9), v1.14.5 (4.14.5), v1.15.1 (4.15.1) | 19 Mar 2026 | https://github.com/kubernetes/kubernetes/issues/137893 |

### Cited Findings
- CVE-2026-24512: affected < v1.13.7 and < v1.14.3, fix is to upgrade to v1.13.7, v1.14.3 or later, and the issue was opened 2026-02-02 — [kubernetes/kubernetes#136678](https://github.com/kubernetes/kubernetes/issues/136678). NVD lists CVSS 3.1 8.8 HIGH from the Kubernetes CNA, published 2026-02-03 — [NVD CVE-2026-24512](https://nvd.nist.gov/vuln/detail/CVE-2026-24512).
- CVE-2026-1580: auth-method annotation injection, affected < v1.13.7 and < v1.14.3, opened 2026-02-02 — [kubernetes/kubernetes#136677](https://github.com/kubernetes/kubernetes/issues/136677). NVD lists 8.8 HIGH (CNA) — [NVD CVE-2026-1580](https://nvd.nist.gov/vuln/detail/CVE-2026-1580).
- CVE-2025-15566: auth-proxy-set-headers injection, affected < v1.12.5 and < v1.13.1, advisory opened 2026-02-06 — [kubernetes/kubernetes#136789](https://github.com/kubernetes/kubernetes/issues/136789). NVD lists 8.8 HIGH, published 2026-02-06 — [NVD CVE-2025-15566](https://nvd.nist.gov/vuln/detail/CVE-2025-15566).
- CVE-2026-3288: the advisory gives "CVSS Rating: 8.8 (HIGH)", affected < 1.13.8, < 1.14.4 and < 1.15.0, opened 2026-03-09 — [kubernetes/kubernetes#137560](https://github.com/kubernetes/kubernetes/issues/137560). NVD lists 8.8 HIGH — [NVD CVE-2026-3288](https://nvd.nist.gov/vuln/detail/CVE-2026-3288).
- CVE-2026-3288 is described as an incomplete fix for CVE-2026-24512. This comes from secondary vendor sources, not the official advisory — [Sysdig](https://www.sysdig.com/blog/detecting-cve-2026-3288-cve-2026-24512-ingress-nginx-configuration-injection-vulnerabilities-for-kubernetes).
- CVE-2026-4342: the advisory text says "8.8 (Medium)", which contradicts the score; affected < v1.13.9, < v1.14.5 and < v1.15.1; opened 2026-03-19 — [kubernetes/kubernetes#137893](https://github.com/kubernetes/kubernetes/issues/137893). NVD, both the primary NIST score and the CNA score, gives 8.8 HIGH — [NVD CVE-2026-4342](https://nvd.nist.gov/vuln/detail/CVE-2026-4342).
- Release PRs map controller versions to chart versions: "Release controller v1.14.3/v1.13.7 & chart v4.14.3/v4.13.7" (merged 2026-02-02) — [ingress-nginx PR #14512](https://github.com/kubernetes/ingress-nginx/pull/14512). "Release controller v1.15.0/v1.14.4/v1.13.8 & chart v4.15.0/v4.14.4/v4.13.8" (2026-03-09) — [PR #14673](https://github.com/kubernetes/ingress-nginx/pull/14673). "Release controller v1.15.1/v1.14.5/v1.13.9 & chart v4.15.1/v4.14.5/v4.13.9" (2026-03-19) — [PR #14738](https://github.com/kubernetes/ingress-nginx/pull/14738).

### Lower-severity 2026 ingress-nginx CVEs (for completeness; excluded from the Critical/High inventory)
- CVE-2026-24513, auth-url protection bypass when a broken custom-errors backend is configured. CVSS 3.1 3.1 LOW. Fixed in v1.13.7 and v1.14.3. Disclosed 2026-02-02 — [kubernetes/kubernetes#136679](https://github.com/kubernetes/kubernetes/issues/136679), [NVD](https://nvd.nist.gov/vuln/detail/CVE-2026-24513).
- CVE-2026-24514, admission controller memory-exhaustion DoS. CVSS 6.5 MEDIUM. Fixed in v1.13.7 and v1.14.3. Disclosed 2026-02-02 — [kubernetes/kubernetes#136680](https://github.com/kubernetes/kubernetes/issues/136680), [NVD](https://nvd.nist.gov/vuln/detail/CVE-2026-24514).
- CVE-2026-116472, mirror-target annotation can write to the controller's unauthenticated internal configuration API, causing a data-plane DoS. CVSS 2.7 LOW. Disclosed 2026-11-05 and labelled `cve/wontfix`. The advisory says: "Kubernetes will not be issuing a fix for this CVE, because ingress-nginx maintenance ended in March 2026." It also says "SUSE has issued a fix ... in version 1.15.2-prime1 of their fork." Mitigations: block the annotation, or set `annotations-risk-level` to Medium or Low — [kubernetes/kubernetes#143852](https://github.com/kubernetes/kubernetes/issues/143852), [NVD](https://nvd.nist.gov/vuln/detail/CVE-2026-116472).

### Related: upstream NGINX core CVEs that reach the bundled nginx (not ingress-nginx's own CVEs)
- NVD lists CVE-2026-123633 (published 2026-11-18): NGINX HTTP/2 use-after-free when proxying to a backend, possible code execution. F5 scores it CVSS 4.0 9.2 CRITICAL and CVSS 3.1 8.1 HIGH — [NVD CVE-2026-123633](https://nvd.nist.gov/vuln/detail/CVE-2026-123633).
- Aikido (a vendor blog, 18 Nov 2026) says ingress-nginx bundles nginx 1.27.1, is vulnerable to CVE-2026-123633 and "won't get a patch". Aikido offers its own patched build of the v1.15.1 controller image — [Aikido](https://www.aikido.dev/blog/nginx2root-critical-nginx-rce-vulnerabilities).
- NVD lists CVE-2026-42945 (published 2026-05-13): ngx_http_rewrite_module PCRE capture bug, F5 CVSS 4.0 9.2 CRITICAL and CVSS 3.1 8.1 HIGH — [NVD CVE-2026-42945](https://nvd.nist.gov/vuln/detail/CVE-2026-42945).
- HeroDevs (a vendor blog, 23 Oct 2026) says CVE-2026-42945 and CVE-2026-42533 reach Ingress NGINX and that there is no upstream fix. It also says the October 2026 nginx CVEs need features that a stock Ingress NGINX deployment does not enable. HeroDevs sells "NES for Ingress NGINX" (v1.15.9) with backports — [HeroDevs](https://www.herodevs.com/blog-posts/ingress-nginx-cves-nginx-1-31-7-1-30-6).
- Before retirement, the project tracked upstream nginx CVE-2026-1642 (SSL upstream injection) in an issue titled "Bump NGINX to 1.28.2+ or 1.29.5+ ..." — [ingress-nginx issue #14528](https://github.com/kubernetes/ingress-nginx/issues/14528).

### Inferences
- Every High ingress-nginx CVE in 2026 belongs to the same class as the March 2025 "IngressNightmare" issues: annotation or path config injection leading to controller RCE and Secret theft. This supports the retirement post's point that snippet and annotation flexibility had become unfixable technical debt.
- A cluster running controller v1.13.9, v1.14.5 or v1.15.1 (charts 4.13.9, 4.14.5 or 4.15.1) has every official 2026 Kubernetes-issued ingress-nginx fix. It remains exposed to CVE-2026-116472 (won't-fix) and to later nginx-core CVEs in the bundled nginx 1.27.1. The nginx 1.27.1 figure comes only from vendor sources.
- CVE-2025-15566 has a 2025 ID but was publicly disclosed in Feb 2026. Its fix, v1.12.5/v1.13.1, predates 2026. The chart versions are presumably 4.12.5 and 4.13.1 by the project's usual numbering, but the advisory does not state them.

### Gaps
- None of the 2026 ingress-nginx CVEs is rated Critical by the Kubernetes CNA or NVD. I found no Critical one.
- The CVE-2026-1580 and CVE-2026-24512 advisories show only a vector, not a numeric score. The 8.8 comes from NVD and the CNA metric.
- I did not check NVD's own analysis or KEV status for each CVE. The NVD status for several is "Deferred".
- I could not confirm from the advisory which Helm chart fixes CVE-2025-15566.
- The claims that the bundled nginx 1.27.1 is exploitable through CVE-2026-123633 and CVE-2026-42945 come from vendors selling patched builds. I did not verify them against the ingress-nginx image build files.

## What is the latest ingress-nginx release and its date?

### Takeaway
The final release is controller v1.15.1 with Helm chart 4.15.1, published 19 March 2026 alongside v1.14.5/4.14.5 and v1.13.9/4.13.9. The repository was archived (read-only) on 24 March 2026, and there have been no releases since.

### Cited Findings
- The releases page marks controller-v1.15.1 (19 Mar) as "Latest". controller-v1.14.5 and v1.13.9 are also dated 19 Mar, and the charts helm-chart-4.15.1, 4.14.5 and 4.13.9 are dated 19 Mar. The page banner reads "This repository was archived by the owner on Mar 24, 2026. It is now read-only." — [GitHub releases](https://github.com/kubernetes/ingress-nginx/releases).
- On `main`, the chart's Chart.yaml shows `version: 4.15.1` and `appVersion: 1.15.1` — [Chart.yaml](https://github.com/kubernetes/ingress-nginx/blob/main/charts/ingress-nginx/Chart.yaml).
- The combined release PR for v1.15.1/v1.14.5/v1.13.9 was merged on 2026-03-19 — [PR #14738](https://github.com/kubernetes/ingress-nginx/pull/14738).
- The GitHub API reports the repo as `archived: true` with the last push on 2026-03-23 — [kubernetes/ingress-nginx](https://github.com/kubernetes/ingress-nginx).
- The README now uses the past tense: "ingress-nginx was an Ingress controller for Kubernetes". It warns: "If you are not already using ingress-nginx, you should not be deploying it ... Instead you should identify a Gateway API implementation" — [README](https://github.com/kubernetes/ingress-nginx/blob/main/README.md).

### Inferences
- v1.15.1 is the final upstream release. With the repo archived, no further official images or charts can be expected.

### Gaps
- The releases page shows day and month without the year. I took 2026 from the PR merge timestamps, which are dated 2026-03-19.

## Has Kubernetes announced retirement / end of best-effort maintenance? Dates and implications for security fixes

### Takeaway
Yes. SIG Network and the Security Response Committee announced the retirement on 11 Nov 2025, with best-effort maintenance continuing until March 2026. After that there are no releases, bug fixes or security fixes. The repository was archived on 24 Mar 2026, and a 5 Nov 2026 CVE was explicitly marked won't-fix. Existing images and charts stay available.

### Cited Findings
- The retirement post was published 11 Nov 2025 by Tabitha Sable (Kubernetes SRC). It says "Best-effort maintenance will continue until March 2026. Afterward, there will be no further releases, no bugfixes, and no updates to resolve any security vulnerabilities that may be discovered." It adds that the GitHub repositories will be made read-only — [Kubernetes blog: Ingress NGINX Retirement](https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/).
- The reasons given are: only one or two maintainers for years, the "snippets" annotations as a serious security flaw ("Yesterday's flexibility has become today's insurmountable technical debt"), and the InGate replacement never maturing, so InGate is being retired too — [Kubernetes blog](https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/).
- The README states: "Existing deployments of Ingress NGINX will not be broken. Existing project artifacts such as Helm charts and container images will remain available." — [README](https://github.com/kubernetes/ingress-nginx/blob/main/README.md).
- The joint statement from the Kubernetes Steering and Security Response Committees was published 29 Jan 2026, with Kat Cosgrove credited in the byline. It reaffirms the March 2026 retirement and calls Ingress NGINX "critical infrastructure for about half of cloud native environments" — [Kubernetes blog statement](https://kubernetes.io/blog/2026/01/29/ingress-nginx-statement/). A secondary summary quotes it as warning that "choosing to remain with Ingress NGINX after its retirement leaves you and your users vulnerable to attack". I could not see that line in my fetch — [same URL](https://kubernetes.io/blog/2026/01/29/ingress-nginx-statement/).
- The 5 Nov 2026 advisory for CVE-2026-116472 says: "Kubernetes will not be issuing a fix for this CVE, because ingress-nginx maintenance ended in March 2026." It points users to vendors, citing SUSE's fork 1.15.2-prime1 — [kubernetes/kubernetes#143852](https://github.com/kubernetes/kubernetes/issues/143852).
- A retirement notice was added to the project website in Feb 2026 — [PR #14539 "Docs: Add retirement notice to website"](https://github.com/kubernetes/ingress-nginx/pull/14539).
- Third-party extended support exists: HeroDevs NES for Ingress NGINX — [HeroDevs](https://www.herodevs.com/blog-posts/ingress-nginx-cves-nginx-1-31-7-1-30-6); SUSE fork — [#143852](https://github.com/kubernetes/kubernetes/issues/143852); Aikido patched image — [Aikido](https://www.aikido.dev/blog/nginx2root-critical-nginx-rce-vulnerabilities).

### Inferences
- The Kubernetes SRC still assigns CVEs and publishes advisories for ingress-nginx, as CVE-2026-116472 in Nov 2026 shows. Each new one now comes with "no fix", so the only options are mitigations, vendor forks, or migrating off.
- Any future vulnerability in the bundled nginx 1.27.1 or the Go dependencies also stays unpatched upstream.

### Gaps
- I did not find an exact retirement or archival announcement post dated March 2026 on kubernetes.io or kubernetes-security-announce. The archive date of 24 Mar 2026 comes from the GitHub banner.
- I could not fetch the full text of the 29 Jan 2026 statement, because the page was truncated.

## What official replacement / migration path is recommended?

### Takeaway
The official recommendation is to migrate immediately to a Gateway API implementation. Users who must stay on the Ingress API should move to another Ingress controller from the Kubernetes docs list. The project ships the ingress2gateway tool, which reached 1.0 on 20 Mar 2026, to help with conversion.

### Cited Findings
- "SIG Network and the Security Response Committee recommend that all Ingress NGINX users begin migration to Gateway API or another Ingress controller immediately." The post points to the Gateway API guides and the Kubernetes list of Ingress controllers, and gives `kubectl get pods --all-namespaces --selector app.kubernetes.io/name=ingress-nginx` to check for usage — [Kubernetes blog](https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/); [Gateway API guides](https://gateway-api.sigs.k8s.io/guides/); [Ingress controllers list](https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/).
- The README tells new users to "identify a Gateway API implementation and use it" — [README](https://github.com/kubernetes/ingress-nginx/blob/main/README.md).
- The kubernetes.io blog lists related posts "Announcing Ingress2Gateway 1.0: Your Path to Gateway API" (20 Mar 2026) and "Before You Migrate: Five Surprising Ingress-NGINX Behaviors You Need to Know" (27 Feb 2026). I saw both in the site navigation of [kubernetes.io blog](https://kubernetes.io/blog/2026/01/29/ingress-nginx-statement/).
- Google Open Source Blog, Feb 2026: "Existing deployments of Ingress NGINX will continue to function and installation artifacts will remain available" — [Google Open Source Blog](https://opensource.googleblog.com/2026/02/the-end-of-an-era-transitioning-away-from-ingress-nginx.html).

### Inferences
- No single successor is endorsed. Kubernetes stays vendor-neutral and points to Gateway API conformant implementations in general. Search summaries note that none is a drop-in replacement for ingress-nginx's annotations.

### Gaps
- I did not fetch the Ingress2Gateway 1.0 post, so I have not verified its features or which ingress-nginx annotations it converts.
- I did not research which specific Gateway API implementations are conformant.
