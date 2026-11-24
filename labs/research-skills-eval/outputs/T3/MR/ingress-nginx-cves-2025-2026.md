# ingress-nginx Critical/High CVEs, 2025 to Present

**Date:** 2026-11-24
**Subject:** `kubernetes/ingress-nginx` (the Kubernetes community controller, not F5/NGINX Inc.'s `nginx/kubernetes-ingress`)
**Scope:** CVEs published by the Kubernetes Security Response Committee (SRC) from 2025-01-01 to 2026-11-24 that rate Critical or High, the releases that fix them, and the mitigations available before upgrading. Lower-severity ingress-nginx CVEs from the same period are listed briefly at the end for completeness.

## Sources and Method

Every claim below traces to one of these first-party sources:

- **[FEED]** The Kubernetes official CVE feed (JSON), `https://kubernetes.io/docs/reference/issues-security/official-cve-feed/index.json`. It was fetched on 2026-11-24, and its `updated_at` was `2026-11-24T01:09:06Z`. It lists every SRC-announced CVE. Filtering it for "ingress" gives the complete set used here.
- **[ADV-n]** The SRC advisory issues in `kubernetes/kubernetes`, all labelled `official-cve-feed`, at `https://github.com/kubernetes/kubernetes/issues/<n>`. Affected versions, fixed versions, CVSS vectors and mitigations are quoted from their bodies and from the embedded OSV JSON.
- **[BLOG-1974]** Kubernetes blog, "Ingress-nginx CVE-2025-1974: What You Need to Know", Tabitha Sable, 2025-03-24, `https://kubernetes.io/blog/2025/03/24/ingress-nginx-cve-2025-1974/`.
- **[BLOG-RETIRE]** Kubernetes blog, "Ingress NGINX Retirement: What You Need to Know", Tabitha Sable, 2025-11-11, `https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/`.
- **[SRC]** The `kubernetes/ingress-nginx` git repository. This covers the release tags (`controller-vX.Y.Z`) and their commit dates, `changelog/controller-*.md`, `README.md`, and the docs under `docs/user-guide/`. These include `cli-arguments.md`, `nginx-configuration/configmap.md` and `nginx-configuration/annotations-risk.md`. They were read at `origin/main` (last commit 2026-03-20) and at specific release tags, as noted below.
- **[VAP]** Kubernetes docs, "Validating Admission Policy", `https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/`.

Some advisories give only a CVSS vector and no score. For those, the score was computed with the CVSS v3.1 base formula and marked *(computed)*. As a check, the same calculation reproduces every score the advisories do state: 9.8, 8.8, 4.8 and 2.7.

## Project Status: Read This First

- In November 2025, SIG Network and the SRC announced the retirement of ingress-nginx. Best-effort maintenance would continue until March 2026. After that there would be "no further releases, no bugfixes, and no updates to resolve any security vulnerabilities that may be discovered" [BLOG-RETIRE]. The repo README carries the same notice. It says new users "should not be deploying it" and should pick a Gateway API implementation instead [SRC `README.md`].
- The last upstream releases are **controller v1.15.1 / v1.14.5 / v1.13.9**, cut on 2026-03-19/20 [SRC tags; `origin/main` HEAD commit "Release controller v1.15.1/v1.14.5/v1.13.9 & chart v4.15.1/v4.14.5/v4.13.9. (#14738)", 2026-03-20].
- The first post-retirement CVE, CVE-2026-116472 (Low), was published 2026-11-05 with the label `cve/wontfix`. Its advisory says: "Kubernetes will not be issuing a fix for this CVE, because ingress-nginx maintenance ended in March 2026". It also notes that SUSE fixed it in its fork's `1.15.2-prime1` [ADV-143852]. Any future ingress-nginx CVE should be expected to be wontfix upstream. **Mitigations and migration are now the only upstream-endorsed remedies.**
- The README also warns: "Do not use in multi-tenant Kubernetes production installations. This project assumes that users that can create Ingress objects are administrators of the cluster" [SRC `README.md`]. Almost every High CVE below needs only Ingress create/update rights (`PR:L`).

## Summary Table: Critical and High

| CVE | Published | Severity (CVSS 3.1) | Vector / root cause | Affected | Fixed in | Advisory |
|-----|-----------|---------------------|---------------------|----------|----------|----------|
| CVE-2025-1974 | 2025-03-23 | **9.8 Critical** | Unauthenticated RCE via the Validating Admission Controller, reachable from the Pod network | < v1.11.0; v1.11.0–1.11.4; v1.12.0 | **v1.11.5, v1.12.1** | [ADV-131009] |
| CVE-2025-1097 | 2025-03-23 | 8.8 High | Config injection via `auth-tls-match-cn` annotation | same as above | v1.11.5, v1.12.1 | [ADV-131007] |
| CVE-2025-1098 | 2025-03-23 | 8.8 High | Config injection via `mirror-target` / `mirror-host` annotations | same as above | v1.11.5, v1.12.1 | [ADV-131008] |
| CVE-2025-24514 | 2025-03-23 | 8.8 High | Config injection via `auth-url` annotation | same as above | v1.11.5, v1.12.1 | [ADV-131006] |
| CVE-2025-15566 | 2026-02-06 | 8.8 High *(computed)* | Config injection via `auth-proxy-set-headers` annotation | < v1.12.5; < v1.13.1 | **v1.12.5, v1.13.1** | [ADV-136789] |
| CVE-2026-1580 | 2026-02-02 | 8.8 High *(computed)* | Config injection via `auth-method` annotation | < v1.13.7; < v1.14.3 | **v1.13.7, v1.14.3** | [ADV-136677] |
| CVE-2026-24512 | 2026-02-02 | 8.8 High *(computed)* | Config injection via `rules.http.paths.path` field | < v1.13.7; < v1.14.3 | **v1.13.7, v1.14.3** | [ADV-136678] |
| CVE-2026-3288 | 2026-03-09 | 8.8 High | Config injection via `rewrite-target` annotation | < 1.13.8; < 1.14.4; < 1.15.0 | **v1.13.8, v1.14.4, v1.15.0** | [ADV-137560] |
| CVE-2026-4342 | 2026-03-19 | 8.8 (see note) | "Comment-based" config injection via a combination of annotations | < v1.13.9; < v1.14.5; < v1.15.1 | **v1.13.9, v1.14.5, v1.15.1** | [ADV-137893] |

Notes on the table:

- **"IngressNightmare" batch (March 2025).** CVE-2025-1974 is the force multiplier. In [BLOG-1974]'s words, it "allows anything on the Pod network to exploit configuration injection vulnerabilities via the Validating Admission Controller". Combined with the three injection CVEs, it means that "anything on the Pod network has a good chance of taking over your Kubernetes cluster, with no credentials or administrative access required". The batch also included CVE-2025-24513 (4.8 Medium, see below). [BLOG-1974] states that v1.12.1 and v1.11.5 fix "all five".
- **Impact common to every 8.8 injection CVE.** Each injection advisory says that exploitation "can lead to arbitrary code execution in the context of the ingress-nginx controller, and disclosure of Secrets accessible to the controller". Each also adds: "in the default installation, the controller can access all Secrets cluster-wide" [ADV-131006, 131007, 131008, 136677, 136678, 136789, 137560, 137893].
- **CVE-2025-15566 timing.** The fixed releases, controller v1.12.5 and v1.13.1, were tagged on 2025-08-12 [SRC tags]. The advisory was not published until 2026-02-06 [ADV-136789, FEED]. Clusters that took the August 2025 patches were already covered.
- **CVE-2026-4342 severity label.** The advisory gives "8.8 (Medium)" next to the vector `AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H` [ADV-137893]. In CVSS v3.1, 8.8 is in the High band (7.0–8.9), and that vector computes to 8.8 High. The "Medium" label looks like a typo in the advisory; treat this CVE as High.
- **What the fixes changed.** This comes from the changelogs. v1.14.3 includes "Annotations: Add `^` and `$` to auth method regex", "Template: Quote all `location` and `server_name` directives, and escape quotes and backslashes" and "Admission Controller: Use 9 MB limit". v1.15.0 includes "Template: Quote `proxy_pass`" and "Annotations: Consider aliases in risk evaluation". v1.15.1 includes "Template: Remove path from comment" [SRC `changelog/controller-1.14.3.md`, `controller-1.15.0.md`, `controller-1.15.1.md`].

### Minimum Safe Versions per Release Line

These are derived from the "fixed" ranges in the OSV data above.

| Running line | Minimum version that clears all Critical/High CVEs above | Notes |
|--------------|-----------------------------------------------------------|-------|
| 1.15.x | **v1.15.1** | Final upstream release |
| 1.14.x | **v1.14.5** | |
| 1.13.x | **v1.13.9** | |
| 1.12.x | none | The last 1.12 tag is v1.12.8 [SRC tags], and no 1.12.x fix is listed for CVE-2026-1580, -24512, -3288 or -4342 |
| 1.11.x and older | none | The last 1.11 tag is v1.11.8 [SRC tags]. v1.11.5 fixes only the March 2025 batch, and no 1.11.x fix is listed for CVE-2025-15566 or anything later |

Upgrade guidance: `https://kubernetes.github.io/ingress-nginx/deploy/upgrade/`, which every advisory links.

## Mitigations for Clusters That Cannot Upgrade Immediately

The officially stated mitigation for each CVE comes first, quoted from its advisory. Hardening that applies across CVEs follows, with each source given. Items marked **(inference)** are this note's reasoning from the docs, not statements in an advisory.

### Per-CVE Official Mitigations

| CVE | Official pre-upgrade mitigation | Detection hint (from advisory) |
|-----|--------------------------------|--------------------------------|
| CVE-2025-1974 | "Disabling the Validating Admission Controller functionality of ingress-nginx" [ADV-131009] | None listed: "no known indicators of compromise" |
| CVE-2025-24514 | Set the `enable-annotation-validation` CLI argument to "true". The advisory says it is not exploitable when this is on, and notes it has defaulted to on since v1.12.0 [ADV-131006] | Suspicious data in `auth-url` |
| CVE-2025-1097 | None stated beyond upgrading [ADV-131007] | Suspicious data in `auth-tls-match-cn` |
| CVE-2025-1098 | None stated beyond upgrading [ADV-131008] | Suspicious data in `mirror-target` / `mirror-host` |
| CVE-2025-15566 | None stated beyond upgrading [ADV-136789] | Suspicious data in a ConfigMap referenced by `auth-proxy-set-headers` |
| CVE-2026-1580 | "Using a validating admission controller to reject Ingress resources with the `nginx.ingress.kubernetes.io/auth-method` annotation" [ADV-136677] | Suspicious data in `auth-method` |
| CVE-2026-24512 | "Using a validating admission controller to reject Ingress resources with the `ImplementationSpecific` path type" [ADV-136678] | Suspicious data in `rules.http.paths.path` |
| CVE-2026-3288 | "Using admission control to block the use of the rewrite-target annotation" [ADV-137560] | The advisory points at `rules.http.paths.path` |
| CVE-2026-4342 | The mitigation section of the advisory is empty [ADV-137893] | The advisory points at `rules.http.paths.path` |

### 1. Disable the ingress-nginx Validating Admission Webhook (CVE-2025-1974)

[BLOG-1974] gives the exact steps:

- **Helm installs:** reinstall with `controller.admissionWebhooks.enabled=false`.
- **Manual installs:** delete the `ValidatingWebhookConfiguration` named `ingress-nginx-admission`. Then edit the `ingress-nginx-controller` Deployment or DaemonSet and remove `--validating-webhook` from the controller container's arguments. The CLI docs confirm: "If not provided, no admission controller is started" [SRC `docs/user-guide/cli-arguments.md`].
- Turn the webhook back on after upgrading. "This feature provides important quality of life improvements for your users" [BLOG-1974].
- This also removes the attack surface of CVE-2025-24513 [ADV-131005] and the admission-controller DoS CVE-2026-24514 (6.5 Medium) [ADV-136680]. **(inference)** Turning the webhook off also disables the admission-time checks that some settings below depend on, such as `strict-validate-path-type`, which "will happen on the Admission Webhook" [SRC `configmap.md`]. If only the Pod-network exposure is the concern, a NetworkPolicy that limits ingress to the webhook port to the API server is an alternative. It is not mentioned in any advisory.

### 2. Use the Controller's Built-In Annotation Hardening

These come from [SRC `docs/user-guide/nginx-configuration/configmap.md`, `cli-arguments.md`, `annotations-risk.md`]:

- **`--enable-annotation-validation`** (CLI flag). In v1.12.0 and later the docs say "Defaults to true". In v1.11.5 they say "This value will be defaulted to true on a future release" [SRC at tags `controller-v1.12.0`, `controller-v1.11.5`]. Clusters on 1.11.x and older must turn it on explicitly. It is the stated mitigation for CVE-2025-24514.
- **`annotations-risk-level`** (ConfigMap key). "If the risk is, for instance `Medium`, annotations with risk High and Critical will not be accepted." The default is `High` in v1.12.0+ and `Critical` in v1.11.5 [SRC at those tags]. The advisory for CVE-2026-116472 explicitly recommends setting it to "Medium" or "Low" [ADV-143852].
  - **(inference)** The risk table [SRC `annotations-risk.md`] rates `auth-tls-match-cn`, `auth-url`, `mirror-host` and `mirror-target` as **High**. Setting `annotations-risk-level: Medium` therefore rejects the annotations behind CVE-2025-1097, CVE-2025-24514 and CVE-2025-1098, as well as CVE-2026-116472.
  - **(inference)** It does **not** help with CVE-2025-15566 (`auth-proxy-set-headers` is **Medium**), CVE-2026-3288 (`rewrite-target` is **Medium**) or CVE-2026-1580 (`auth-method` is **Low**). Those need an external admission policy (section 3).
- **`allow-snippet-annotations`** (ConfigMap key). The default is `false`. Leave it that way unless you "TRUST users with permission to create Ingress objects" [SRC `configmap.md`].
- **`strict-validate-path-type`** (ConfigMap key). The default is `"true"` in v1.12.0+ and `"false"` in v1.11.5 [SRC at tags]. For `Exact` and `Prefix`, paths are limited to alphanumerics plus `-`, `_` and `/`. Admins are told to use a policy engine to "validate that only authorized users can use `ImplementationSpecific` pathType" [SRC `configmap.md`]. That gap is the one CVE-2026-24512 exploits.
- **`annotation-value-word-blocklist`** (ConfigMap key). The default is empty. The docs suggest `"load_module,lua_package,_by_lua,location,root,proxy_pass,serviceaccount,{,},',\""` [SRC `configmap.md`]. **(inference)** It is a coarse defence in depth against annotation-value injection and is not named as a mitigation in any 2025–2026 advisory.
- **`allow-cross-namespace-resources`** (ConfigMap key). The default is `false`, and `auth-proxy-set-header` is listed among the impacted annotations [SRC `configmap.md`]. **(inference)** Keeping it false limits which ConfigMaps an attacker can point CVE-2025-15566 at, but it does not fix the injection.

### 3. External Admission Policy for the 2026 CVEs

For CVE-2026-1580, CVE-2026-24512 and CVE-2026-3288, the advisories recommend using a separate admission controller to reject the dangerous fields [ADV-136677, 136678, 137560]. They do not include a policy. `ValidatingAdmissionPolicy` is "Stable since Kubernetes v1.30" and needs a policy plus a `ValidatingAdmissionPolicyBinding` [VAP]. The sketch below follows the documented schema. **It has not been tested against a live cluster in this research.** Validate it in staging and use `validationActions: [Warn, Audit]` first [VAP]. If the controller runs with a custom `--annotations-prefix` (default `nginx.ingress.kubernetes.io` [SRC `cli-arguments.md`]), adjust the keys.

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: ingress-nginx-cve-2026-mitigations
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
    - apiGroups:   ["networking.k8s.io"]
      apiVersions: ["v1"]
      operations:  ["CREATE", "UPDATE"]
      resources:   ["ingresses"]
  validations:
  - expression: >-
      !has(object.metadata.annotations) ||
      !('nginx.ingress.kubernetes.io/auth-method' in object.metadata.annotations)
    message: "auth-method annotation blocked (CVE-2026-1580)"
  - expression: >-
      !has(object.metadata.annotations) ||
      !('nginx.ingress.kubernetes.io/rewrite-target' in object.metadata.annotations)
    message: "rewrite-target annotation blocked (CVE-2026-3288)"
  - expression: >-
      !has(object.spec.rules) || object.spec.rules.all(r,
        !has(r.http) || r.http.paths.all(p, p.pathType != 'ImplementationSpecific'))
    message: "ImplementationSpecific pathType blocked (CVE-2026-24512)"
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: ingress-nginx-cve-2026-mitigations
spec:
  policyName: ingress-nginx-cve-2026-mitigations
  validationActions: [Deny]
```

Caveats: **(inference)** Blocking `rewrite-target` and `ImplementationSpecific` will break any Ingress that legitimately uses them, including regex paths. The docs say regex paths "should use `ImplementationSpecific` pathType" [SRC `configmap.md`]. A narrower option is to scope the binding to untrusted namespaces with `matchResources.namespaceSelector` [VAP]. The policy only runs on CREATE and UPDATE, so audit existing Ingresses for these fields as well. It is also the detection step each advisory recommends.

### 4. Reduce Blast Radius and Who Can Exploit

- **(inference)** Every injection CVE needs `PR:L`, meaning the right to create or update Ingresses. Limiting that RBAC verb to trusted administrators matches the project's own assumption [SRC `README.md`] and cuts the exposure to all 8.8 CVEs.
- **(inference)** The advisories stress that by default the controller can read all Secrets cluster-wide. Scoping the controller to specific namespaces, and so to fewer Secrets, reduces what a successful RCE exposes. This hardening is not described in the advisories.

### 5. Plan the Exit

Upstream will not ship fixes for anything found after March 2026 (CVE-2026-116472 is the precedent [ADV-143852]). The SRC recommends migrating "to Gateway API or another Ingress controller immediately" [BLOG-RETIRE]. Vendor forks are the only remaining source of patches for in-place users; SUSE's `1.15.2-prime1` is cited by the SRC itself [ADV-143852]. The mitigations above are a bridge, not an end state.

## Lower-Severity ingress-nginx CVEs in the Same Window

These are listed for completeness and are out of the Critical/High scope.

| CVE | Published | Severity | Summary | Fixed in | Mitigation |
|-----|-----------|----------|---------|----------|------------|
| CVE-2025-24513 | 2025-03-23 | 4.8 Medium | Auth secret file path traversal in the admission controller | v1.11.5, v1.12.1 | Disable the admission controller [ADV-131005] |
| CVE-2026-24514 | 2026-02-02 | 6.5 Medium *(computed)* | Admission controller memory-exhaustion DoS via large requests | v1.13.7, v1.14.3 | None stated. Detection: requests "larger than a few megabytes" [ADV-136680] |
| CVE-2026-24513 | 2026-02-02 | 3.1 Low *(computed)* | `auth-url` bypass when a broken custom-errors backend ignores `X-Code` for 401/403 | v1.13.7, v1.14.3 | Confirm the custom errors backend respects `X-Code` [ADV-136679] |
| CVE-2026-116472 | 2026-11-05 | 2.7 Low | `mirror-target` can reach the controller's unauthenticated internal config API (data-plane DoS) | **No upstream fix** (`cve/wontfix`). SUSE fork 1.15.2-prime1 | Reject `mirror-target` via admission, or set `annotations-risk-level` to Medium/Low. Detection: localhost addresses in `mirror-target` [ADV-143852] |

Out of scope but easy to confuse: the `kubernetes/ingress-nginx` issue tracker in 2025–2026 also has image-scanner reports for bundled components. Examples are Go CVE-2025-68121 (#14590), OpenSSL CVE-2025-15467 (#14482), NGINX CVE-2026-1642 (#14528) and libxml2 CVE-2025-49794/49796 (#14041). These are dependency CVEs addressed through image bumps, not SRC-announced ingress-nginx CVEs, and they do not appear in [FEED].

## Gaps and Caveats

- The severities for CVE-2025-15566, CVE-2026-1580, CVE-2026-24512, CVE-2026-24514 and CVE-2026-24513 are computed from the advisory vectors, because the advisories omit the numeric score.
- NVD and vendor scores were not consulted, by design, to keep to first-party sources. They may differ.
- The `ValidatingAdmissionPolicy` example has not been run against a cluster.
- "Today" is 2026-11-24. The [FEED] snapshot is from that date. Re-check [FEED] for later announcements.
