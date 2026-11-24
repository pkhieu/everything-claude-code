# Mitigations and Workarounds for ingress-nginx CVEs (2025 to Nov 2026), for Clusters That Cannot Upgrade Immediately

Scope: the Kubernetes community controller only (github.com/kubernetes/ingress-nginx), not F5/NGINX Inc's nginx-ingress. The primary sources are the official Kubernetes SRC advisory issues in kubernetes/kubernetes, all labelled `official-cve-feed` and authored by Tabitha Sable. A GitHub search on 2026-11-24 found 13 such ingress-nginx advisories from 2025 onward ([search](https://github.com/kubernetes/kubernetes/issues?q=is%3Aissue+label%3Aofficial-cve-feed+ingress-nginx)).

## What mitigations do the official advisories prescribe, per vulnerability class?

### Takeaway
For the config-injection CVEs, the advisories almost always prescribe a validating admission policy that rejects the specific annotation or field. For the admission-webhook flaws (CVE-2025-1974, CVE-2025-24513), they prescribe turning the validating webhook off. Three ConfigMap or CLI knobs also help: `enable-annotation-validation`, `annotations-risk-level` and `strict-validate-path-type`. Since March 2026 upstream ships no fixes, so for new CVEs these workarounds, a vendor fork or migration are the only options.

### Cited Findings

**Project status (affects every mitigation decision)**
- In November 2025 SIG Network and the SRC announced: "In March 2026, Ingress NGINX maintenance will be halted, and the project will be retired. After that time, there will be no further releases, no bugfixes, and no updates to resolve any security vulnerabilities." Existing Helm charts and images stay available. They recommend migrating to Gateway API or another Ingress controller "immediately". — [Kubernetes blog: Ingress NGINX Retirement](https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/)
- The GitHub page for kubernetes/ingress-nginx states the "repository was archived by the owner on Mar 24, 2026". — [GitHub kubernetes/ingress-nginx PR #13131 page banner](https://github.com/kubernetes/ingress-nginx/issues/13131)
- Wiz's update gives a conflicting date: it says ingress-nginx "has become EOL at Nov 12, 2025" (the announcement date), while also saying maintenance halts in March 2026. — [Wiz IngressNightmare blog](https://www.wiz.io/blog/ingress-nginx-kubernetes-vulnerabilities). The Kubernetes blog's March 2026 date is authoritative for when maintenance ended. — [Kubernetes blog](https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/)
- For CVE-2026-116472 (Nov 2026), the advisory says "Kubernetes will not be issuing a fix for this CVE, because ingress-nginx maintenance ended in March 2026". It adds that "SUSE has issued a fix for this CVE in version 1.15.2-prime1 of their fork of ingress-nginx." — [kubernetes/kubernetes#143852](https://github.com/kubernetes/kubernetes/issues/143852)

**Class A: admission webhook exposure (IngressNightmare, March 2025)**
- **CVE-2025-1974** (CVSS 9.8 Critical): "an unauthenticated attacker with access to the pod network can achieve arbitrary code execution in the context of the ingress-nginx controller", which can expose all Secrets the controller can read (cluster-wide by default).
  - Affected: < v1.11.0, v1.11.0 to 1.11.4, and v1.12.0. Fixed in v1.11.5 and v1.12.1.
  - Official mitigation: "Before applying the patch, this issue can be mitigated by disabling the Validating Admission Controller functionality of ingress-nginx."
  - Source: [kubernetes/kubernetes#131009](https://github.com/kubernetes/kubernetes/issues/131009)
- **CVE-2025-24513** (CVSS 4.8): path traversal by the admission controller. It is mitigated the same way, by disabling the Validating Admission Controller. — [kubernetes/kubernetes#131005](https://github.com/kubernetes/kubernetes/issues/131005)
- **Exact steps** from the Kubernetes blog:
  - Helm: "Reinstall, setting the Helm value `controller.admissionWebhooks.enabled=false`".
  - Manual install: "delete the ValidatingWebhookconfiguration called `ingress-nginx-admission`" and "edit the ingress-nginx-controller Deployment or Daemonset, removing `--validating-webhook` from the controller container's argument list".
  - Source: [Kubernetes blog CVE-2025-1974](https://kubernetes.io/blog/2025/03/24/ingress-nginx-cve-2025-1974/)
- **Side effect** (official): "remember to turn it back on after you upgrade. This feature provides important quality of life improvements for your users, warning them about incorrect Ingress configurations before they can take effect." — [Kubernetes blog CVE-2025-1974](https://kubernetes.io/blog/2025/03/24/ingress-nginx-cve-2025-1974/)
- Wiz says the same: re-enable the webhook after upgrading "because it provides important safeguards for your Ingress configurations". — [Wiz](https://www.wiz.io/blog/ingress-nginx-kubernetes-vulnerabilities)
- How the fix works: Wiz reports that "Kubernetes ... removed the NGINX configuration validation from the admission controller, resolving CVE-2025-1974" (Feb 20, 2025). — [Wiz disclosure timeline](https://www.wiz.io/blog/ingress-nginx-kubernetes-vulnerabilities)
- **CVE-2026-24514** (admission controller DoS, CVSS vector A:H): "By sending large requests to the validating admission controller, an attacker can cause memory consumption, which may result in the ingress-nginx controller pod being killed or the node running out of memory."
  - Affected: < 1.13.7 and < 1.14.3. The only mitigation listed is upgrading; no workaround is given.
  - Source: [kubernetes/kubernetes#136680](https://github.com/kubernetes/kubernetes/issues/136680)

**Class B: annotation-based nginx config injection**
- **CVE-2025-24514** (auth-url, CVSS 8.8): "This issue does not affect you if you have the `enable-annotation-validation` CLI argument enabled. (This option is enabled by default starting from ingress-nginx v1.12.0.)" The mitigation before upgrading is to set `enable-annotation-validation` to "true". — [kubernetes/kubernetes#131006](https://github.com/kubernetes/kubernetes/issues/131006)
  - The Helm chart exposes this as `controller.enableAnnotationValidations: true` (the default in the current chart). — [chart values.yaml](https://github.com/kubernetes/ingress-nginx/blob/main/charts/ingress-nginx/values.yaml)
- **CVE-2025-1097** (auth-tls-match-cn, 8.8) and **CVE-2025-1098** (mirror-target / mirror-host, 8.8): the advisories list only "Upgrade ... to v1.11.5, v1.12.1"; no pre-upgrade workaround is given. — [#131007](https://github.com/kubernetes/kubernetes/issues/131007), [#131008](https://github.com/kubernetes/kubernetes/issues/131008)
  - Wiz explains that the CVE-2025-1098 injection goes through the Ingress object's UID field. That field "is not a Kubernetes annotation, our input does not get sanitized by the annotations' regex rules", so annotation validation alone does not cover it. — [Wiz](https://www.wiz.io/blog/ingress-nginx-kubernetes-vulnerabilities)
- **CVE-2025-15566** (auth-proxy-set-headers, published Feb 2026): affected < v1.12.5 and < v1.13.1. The only listed mitigation is upgrading. For detection, look for "suspicious data within a configmap passed to the `nginx.ingress.kubernetes.io/auth-proxy-set-headers` annotation". — [kubernetes/kubernetes#136789](https://github.com/kubernetes/kubernetes/issues/136789)
- **CVE-2026-1580** (auth-method, Feb 2026): affected < v1.13.7 and < v1.14.3. Mitigation: "using a validating admission controller to reject Ingress resources with the `nginx.ingress.kubernetes.io/auth-method` annotation." — [kubernetes/kubernetes#136677](https://github.com/kubernetes/kubernetes/issues/136677)
- **CVE-2026-3288** (rewrite-target, 8.8 High, Mar 2026): affected < 1.13.8, < 1.14.4 and < 1.15.0. Mitigation: "using admission control to block the use of the rewrite-target annotation." — [kubernetes/kubernetes#137560](https://github.com/kubernetes/kubernetes/issues/137560)
- **CVE-2026-4342** ("comment-based" injection via "a combination of Ingress annotations", 8.8, Mar 2026): affected < v1.13.9, < v1.14.5 and < v1.15.1. The "How do I mitigate" section of the advisory is empty apart from upgrade instructions, so no official workaround exists. — [kubernetes/kubernetes#137893](https://github.com/kubernetes/kubernetes/issues/137893)
- **CVE-2026-116472** (mirror-target self-DoS, 2.7 Low, Nov 2026): "the mirror-target Ingress annotation can be used to target an unauthenticated configuration API within the ingress-nginx controller". This can drop all traffic until a config change or restart.
  - Mitigation: "using an admission controller to reject Ingresses that specify the mirror-target annotation, or by setting the annotations-risk-level configMap parameter to 'Medium' or 'Low'."
  - Source: [kubernetes/kubernetes#143852](https://github.com/kubernetes/kubernetes/issues/143852)

**Class C: path field injection**
- **CVE-2026-24512** (`rules.http.paths.path`, Feb 2026): affected < v1.13.7 and < v1.14.3. Mitigation: "using a validating admission controller to reject Ingress resources with the `ImplementationSpecific` path type." — [kubernetes/kubernetes#136678](https://github.com/kubernetes/kubernetes/issues/136678)
- `strict-validate-path-type` (ConfigMap, default "true"): for `Exact` and `Prefix` paths it allows only paths starting with "/" and containing only alphanumerics, "-", "_" and "/". Validation "will happen on the Admission Webhook", and Ingresses that need regex characters "should use ImplementationSpecific pathType". The docs add: "The cluster admin should establish validation rules using mechanisms like Open Policy Agent to validate that only authorized users can use ImplementationSpecific pathType and that only the authorized characters can be used." — [ConfigMap docs](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/)

**Class D: auth bypass (misconfiguration-dependent)**
- **CVE-2026-24513** (auth-url protection bypass, low severity, vector AC:H C:L): exploitable only when default custom-errors include 401/403 and the custom-errors backend "fails to respect the X-Code HTTP header". Mitigation: "checking to confirm your custom errors backend correctly respects the `X-Code` HTTP header." — [kubernetes/kubernetes#136679](https://github.com/kubernetes/kubernetes/issues/136679)

**Global hardening knobs (ConfigMap reference)**
- `allow-snippet-annotations`: default `false`. The docs recommend "enabling this option only if you TRUST users with permission to create Ingress objects". — [ConfigMap docs](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/)
  - Helm: `controller.allowSnippetAnnotations: false`. The chart comment notes "Global snippets in ConfigMap are still respected". — [values.yaml](https://github.com/kubernetes/ingress-nginx/blob/main/charts/ingress-nginx/values.yaml)
- `annotations-risk-level`: default `High`. "If the risk is, for instance Medium, annotations with risk High and Critical will not be accepted. Accepted values are Critical, High, Medium and Low." — [ConfigMap docs](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/)
- Risk levels in the current annotations-risk table: — [Annotations risk docs](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations-risk/)
  - Critical: configuration-snippet, server-snippet, auth-snippet, stream-snippet, modsecurity-snippet
  - High: mirror-target, mirror-host, auth-url, auth-tls-match-cn
  - Medium: rewrite-target, auth-proxy-set-headers, permanent-redirect
  - Low: auth-method, use-regex
- `annotation-value-word-blocklist`: default "" (related to CVE-2021-25742). A match means "the whole Ingress won't be configured". The suggested list is `load_module,lua_package,_by_lua,location,root,proxy_pass,serviceaccount,{,},',"`. — [ConfigMap docs](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/)
- An issue filed on 2026-02-26 reports that the "modsecurity-snippet annotation is not validated in webhook validator". — [kubernetes/ingress-nginx#14604](https://github.com/kubernetes/ingress-nginx/issues/14604) (an issue title only; I did not verify its content)

### Inferences
- These inferences combine the risk table with the advisories:
  - `annotations-risk-level: Medium` rejects the High-rated mirror-target/mirror-host, auth-url and auth-tls-match-cn annotations, covering the annotation vectors of CVE-2025-24514, CVE-2025-1097 and CVE-2026-116472.
  - `Low` additionally rejects rewrite-target and auth-proxy-set-headers (CVE-2026-3288, CVE-2025-15566).
  - No risk level blocks auth-method, which is rated Low. That is why CVE-2026-1580 needs an external admission policy.
  - CVE-2025-1098's UID vector is not an annotation, so the mirror annotation itself must be blocked.
  - The risk table is the current docs version. Older controllers may not support `annotations-risk-level` at all, so check against your running version.
- Side effects of lowering `annotations-risk-level`: any existing Ingress that uses a now-disallowed annotation (for example rewrite-target, which is very common) will stop being accepted or configured. Audit existing Ingresses before changing it.
- Side effects of blocking `ImplementationSpecific` path types: regex-based routing breaks, because the docs say regex paths must use `ImplementationSpecific`.
- Side effects of disabling the webhook: nothing pre-validates Ingress objects. A bad Ingress can be accepted and then fail at nginx reload, a failure mode reported in [#13690](https://github.com/kubernetes/ingress-nginx/issues/13690). Also, ConfigMap protections such as `strict-validate-path-type` are enforced "on the Admission Webhook" per the docs, so they lose their admission-time rejection. There is a real tension between mitigating CVE-2025-1974 (webhook off) and the path-injection class (webhook-based validation). An external policy engine fills that gap.

### Gaps
- No official workaround exists for CVE-2025-1097, CVE-2025-1098 (beyond upgrading), CVE-2025-15566, CVE-2026-24514 or CVE-2026-4342. Mitigation notes for these are inferences.
- The CVE-2026-3288 advisory's Detection section mentions "`rules.http.paths.path`" rather than rewrite-target. This looks like a copy-paste from CVE-2026-24512, but it is not confirmed. — [#137560](https://github.com/kubernetes/kubernetes/issues/137560)
- I did not verify at which controller version `annotations-risk-level` and `strict-validate-path-type` were introduced.
- Third-party summaries from search mention a "CVE-2026-118899" (nginx TLS 1.3 loop, HeroDevs) and other October 2026 nginx CVEs. These are not official Kubernetes SRC ingress-nginx advisories and were not verified, so they are excluded.

## How can admins detect vulnerable versions and exploitation attempts?

### Takeaway
Official detection is limited to two things: a kubectl pod-selector check, and inspecting the named annotation or field for "suspicious data". CVE-2025-1974 and CVE-2025-24513 have "no known indicators of compromise". Vendor runtime rules, notably the Sysdig/Falco rule for shared-library loads from `/proc` by nginx, and a Nuclei template for exposed webhooks fill that gap.

### Cited Findings
- Presence check used in every advisory: `kubectl get pods --all-namespaces --selector app.kubernetes.io/name=ingress-nginx`. — [#131009](https://github.com/kubernetes/kubernetes/issues/131009), [#143852](https://github.com/kubernetes/kubernetes/issues/143852), [Kubernetes blog](https://kubernetes.io/blog/2025/03/24/ingress-nginx-cve-2025-1974/)
- Wiz notes this check needs "(at least) cluster-scoped read-only permissions". — [Wiz](https://www.wiz.io/blog/ingress-nginx-kubernetes-vulnerabilities)
- CVE-2025-1974 and CVE-2025-24513: "There are no known indicators of compromise that prove this vulnerability has been exploited." — [#131009](https://github.com/kubernetes/kubernetes/issues/131009), [#131005](https://github.com/kubernetes/kubernetes/issues/131005)
- Per-CVE indicators from the advisories:

  | CVE | Indicator |
  | --- | --- |
  | CVE-2025-24514 | suspicious data in `auth-url` ([#131006](https://github.com/kubernetes/kubernetes/issues/131006)) |
  | CVE-2025-1097 | suspicious data in `auth-tls-match-cn` ([#131007](https://github.com/kubernetes/kubernetes/issues/131007)) |
  | CVE-2025-1098 | suspicious data in `mirror-target` / `mirror-host` ([#131008](https://github.com/kubernetes/kubernetes/issues/131008)) |
  | CVE-2026-1580 | suspicious data in `auth-method` ([#136677](https://github.com/kubernetes/kubernetes/issues/136677)) |
  | CVE-2026-24512, CVE-2026-4342 | suspicious data in `rules.http.paths.path` ([#136678](https://github.com/kubernetes/kubernetes/issues/136678), [#137893](https://github.com/kubernetes/kubernetes/issues/137893)) |
  | CVE-2025-15566 | suspicious data in the ConfigMap referenced by `auth-proxy-set-headers` ([#136789](https://github.com/kubernetes/kubernetes/issues/136789)) |
  | CVE-2026-116472 | "Localhost addresses in the mirror-target annotation" ([#143852](https://github.com/kubernetes/kubernetes/issues/143852)) |
  | CVE-2026-24514 | "Requests larger than a few megabytes being sent to the ingress-nginx admission controller" ([#136680](https://github.com/kubernetes/kubernetes/issues/136680)) |
  | CVE-2026-24513 | you are affected if a URL protected by `auth-url` loads despite failed authentication ([#136679](https://github.com/kubernetes/kubernetes/issues/136679)) |

- Report evidence of exploitation to security@kubernetes.io. — [#131009](https://github.com/kubernetes/kubernetes/issues/131009)
- Wiz recommends ensuring "the admission webhook endpoint is not exposed externally" and offers a Nuclei template to check for exposed admission controllers. It found "over 6,500 clusters" exposing vulnerable admission controllers to the internet. — [Wiz](https://www.wiz.io/blog/ingress-nginx-kubernetes-vulnerabilities)
- How the exploit chain works: it uploads a shared library through nginx client-body buffering (bodies larger than 8KB by default), then injects `ssl_engine` pointing at `/proc/<pid>/fd/<n>`. — [Wiz](https://www.wiz.io/blog/ingress-nginx-kubernetes-vulnerabilities)
- Sysdig's Falco rule "Potential IngressNightmare Vulnerability Exploitation" uses this condition. It detects "shared libraries loaded from /proc in the NGINX Ingress container". — [Sysdig blog](https://www.sysdig.com/blog/detecting-and-mitigating-ingressnightmare-cve-2025-1974)

  ```
  evt.type in (mmap,mmap2) and proc.name contains "nginx" and fd.name startswith "/proc/" and fd.name contains "/fd/" and evt.arg.prot contains PROT_EXEC and container
  ```

- For version detection in policy, Kyverno's library policy `check-ingress-nginx-controller-version-and-annotation-policy` (ValidatingPolicy, Audit mode) checks controller Pod images by `registry.k8s.io/ingress-nginx/controller:` prefix. It also disallows `server-snippet` and constrains `auth-tls-verify-client` values. Its version floor (1.11.2+) predates the 2025-2026 CVEs, so it must be updated before use. — [kyverno/policies](https://github.com/kyverno/policies/blob/main/other-vpol/check-ingress-nginx-controller-version-and-annotation-policy/check-ingress-nginx-controller-version-and-annotation-policy.yaml)

### Inferences
- Practical version check (my own, unsourced): list controller images with `kubectl get pods -A -l app.kubernetes.io/name=ingress-nginx -o jsonpath='{range .items[*]}{.metadata.namespace}{"\t"}{.spec.containers[*].image}{"\n"}{end}'`. Compare each image against the fixed floors:
  - v1.11.5 / v1.12.1 (March 2025)
  - v1.12.5 / v1.13.1 (CVE-2025-15566)
  - v1.13.7 / v1.14.3 (Feb 2026)
  - v1.13.8 / v1.14.4 / v1.15.0 (CVE-2026-3288)
  - v1.13.9 / v1.14.5 / v1.15.1 (CVE-2026-4342)
  - Any upstream version is affected by CVE-2026-116472.
- To hunt for annotation indicators, dump `kubectl get ingress -A -o json` and look for newlines, `{`, `}`, `;`, `#` or nginx directives (for example `ssl_engine`, `load_module`, `_by_lua`) in the annotations named above and in `paths[].path`. Also look for localhost or 127.0.0.1 in mirror-target. Kubernetes audit logs of Ingress create/update requests carry the same data historically. This is inferred from the advisories' "suspicious data" wording plus Wiz's description of the `ssl_engine` technique.
- For CVE-2025-1974, attacker AdmissionReview requests sent directly to the webhook bypass the API server. They therefore do not appear in Kubernetes audit logs, so runtime and network telemetry (the Falco rule, network flow logs to port 8443) are the relevant signals. This follows from Wiz's description that requests go "directly to the admission controller through the network".

### Gaps
- I found no official SRC-published Falco or Sigma rules. The Sysdig rule is vendor-authored.
- No vendor detection rules were found for the 2026 CVEs specifically.

## What policy-engine controls (Kyverno/Gatekeeper/ValidatingAdmissionPolicy) are recommended to block risky annotations?

### Takeaway
The 2026 advisories explicitly name "a validating admission controller" as the primary pre-upgrade mitigation for CVE-2026-1580, CVE-2026-24512, CVE-2026-3288 and CVE-2026-116472, but they do not name a specific engine. A native ValidatingAdmissionPolicy or Kyverno/Gatekeeper rule denying those annotations and the `ImplementationSpecific` pathType is the expected implementation. Ready-made library policies are sparse and outdated.

### Cited Findings
- The advisories require rejecting Ingresses with:
  - `auth-method` ([#136677](https://github.com/kubernetes/kubernetes/issues/136677))
  - `pathType: ImplementationSpecific` ([#136678](https://github.com/kubernetes/kubernetes/issues/136678))
  - `rewrite-target` ([#137560](https://github.com/kubernetes/kubernetes/issues/137560))
  - `mirror-target` ([#143852](https://github.com/kubernetes/kubernetes/issues/143852))
- The ingress-nginx docs recommend using "mechanisms like Open Policy Agent" to restrict who may use ImplementationSpecific paths and which characters are allowed. — [ConfigMap docs](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/)
- The Kyverno library has a CEL-based `ValidatingPolicy` that denies `nginx.ingress.kubernetes.io/server-snippet`. It ships with `validationActions: [Audit]`, so it must be switched to Deny to block. — [kyverno/policies](https://github.com/kyverno/policies/blob/main/other-vpol/check-ingress-nginx-controller-version-and-annotation-policy/check-ingress-nginx-controller-version-and-annotation-policy.yaml)

### Inferences
- Illustrative, untested and not from an official source: a Kubernetes ValidatingAdmissionPolicy plus a Binding with `validationActions: [Deny]`, matching `networking.k8s.io/v1` `ingresses` on CREATE/UPDATE, with these validations:
  - `!has(object.metadata.annotations) || !object.metadata.annotations.exists(k, k in ['nginx.ingress.kubernetes.io/auth-method','nginx.ingress.kubernetes.io/rewrite-target','nginx.ingress.kubernetes.io/mirror-target','nginx.ingress.kubernetes.io/mirror-host','nginx.ingress.kubernetes.io/auth-proxy-set-headers','nginx.ingress.kubernetes.io/configuration-snippet','nginx.ingress.kubernetes.io/server-snippet','nginx.ingress.kubernetes.io/auth-snippet'])`
  - `!has(object.spec.rules) || object.spec.rules.all(r, !has(r.http) || r.http.paths.all(p, p.pathType != 'ImplementationSpecific'))`
  - Use a namespace selector or parameter-based exceptions for trusted teams.
  - Because it runs in the API server, this does not depend on the vulnerable ingress-nginx webhook. It therefore stays effective when that webhook is disabled for CVE-2025-1974.
- Side effects: blocking rewrite-target and ImplementationSpecific breaks many common routing patterns. Exceptions or a staged Audit-then-Deny rollout are needed.
- Policy engines do not protect against CVE-2025-1974 or CVE-2026-24514. An attacker on the pod network talks to the ingress-nginx webhook directly, bypassing API-server admission (per Wiz's attack description).

### Gaps
- I found no official Kubernetes-published Kyverno, Gatekeeper or VAP manifests for these CVEs. I did not locate Gatekeeper-library policies for ingress-nginx annotations.
- I did not confirm whether a Kyverno library `disallow-ingress-nginx-custom-snippets` policy still exists at its former path. The raw URL returned 404.

## What network policy restrictions are recommended?

### Takeaway
Wiz's recommendation, echoed as standard practice, is strict network policies so that only the Kubernetes API server can reach the admission webhook (port 8443 by default), and never exposing it publicly. The Kubernetes SRC advisory itself prescribes disabling the webhook rather than network policy.

### Cited Findings
- Wiz: "Enforce strict network policies so only the Kubernetes API Server can access the admission controller". In its view the attack surface "should be restricted in a much better way: removing access from pods within the cluster, and never exposing this publicly". — [Wiz](https://www.wiz.io/blog/ingress-nginx-kubernetes-vulnerabilities)
- The official blog explains the risk: "In many common scenarios, the Pod network is accessible to all workloads in your cloud VPC, or even anyone connected to your corporate network!" — [Kubernetes blog](https://kubernetes.io/blog/2025/03/24/ingress-nginx-cve-2025-1974/)
- Helm chart defaults:
  - `controller.admissionWebhooks.port: 8443`, `failurePolicy: Fail`
  - `controller.networkPolicy.enabled: false`
  - `controller.admissionWebhooks.patch.networkPolicy.enabled: false`
  - Source: [values.yaml](https://github.com/kubernetes/ingress-nginx/blob/main/charts/ingress-nginx/values.yaml)
- CVE-2026-116472's target is an "unauthenticated configuration API within the ingress-nginx controller", reached via mirror-target from nginx itself. — [#143852](https://github.com/kubernetes/kubernetes/issues/143852)

### Inferences
- A NetworkPolicy on the controller pods should do two things:
  - Allow ingress on 80/443 from the intended sources.
  - Allow 8443 only from the API server or control-plane source CIDRs, and deny all other pod-network access to 8443.
- Side effect: on managed clusters the API-server source IP can be hard to express in NetworkPolicy, since it often arrives from node or control-plane IPs outside pod CIDRs. Misconfiguring it with `failurePolicy: Fail` blocks all Ingress create/update operations.
- A NetworkPolicy does not mitigate CVE-2026-116472. The configuration API is reached from inside the controller (localhost), so only blocking mirror-target helps.

### Gaps
- I did not verify the exact semantics of the chart's `controller.networkPolicy` template, such as whether it restricts 8443.
- I found no official SRC-authored NetworkPolicy manifest.

## What are the side effects and trade-offs of each mitigation?

### Takeaway
Every workaround trades functionality or safety nets for reduced attack surface, and none is a substitute for upgrading or migrating.

### Cited Findings

| Mitigation | Trade-off |
| --- | --- |
| Disable the webhook | You lose early warnings about incorrect Ingress configs ([Kubernetes blog](https://kubernetes.io/blog/2025/03/24/ingress-nginx-cve-2025-1974/)). Webhook-enforced checks such as `strict-validate-path-type` stop rejecting at admission ([ConfigMap docs](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/)). |
| `allow-snippet-annotations=false` | Breaks Ingresses relying on snippet annotations. Users have filed requests for alternatives, for example [#12945](https://github.com/kubernetes/ingress-nginx/issues/12945) "No way to provide more set input headers on request other than snippet annotations". |
| `annotation-value-word-blocklist` | It "override[s]" the default list, and a match prevents "the whole Ingress" from being configured ([ConfigMap docs](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/)). |
| Enable annotation validation | It can reject previously working Ingresses. See [#13092](https://github.com/kubernetes/ingress-nginx/issues/13092) "Annotation validation impaired existing ingress objects" and [#13095](https://github.com/kubernetes/ingress-nginx/issues/13095) (an issue title only; content not reviewed). |
| Staying on upstream after March 2026 | No fixes are coming (for example CVE-2026-116472). Options are vendor forks (SUSE 1.15.2-prime1, [#143852](https://github.com/kubernetes/kubernetes/issues/143852)) or migration to Gateway API or another controller ([retirement blog](https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/)). |

### Inferences
- Recommended layering for a cluster stuck on an old version:
  1. Webhook off, or network-restricted to the API server only.
  2. `allow-snippet-annotations=false` and `annotations-risk-level` set to Medium (or Low if rewrite-target can be dropped).
  3. A VAP or Kyverno policy denying auth-method, rewrite-target, mirror-*, auth-proxy-set-headers and ImplementationSpecific, with scoped exceptions.
  4. Falco runtime detection.
  5. A dated migration plan.
- Even this layering leaves CVE-2026-4342 without a documented mitigation.

### Gaps
- I found no quantitative data on how many production Ingresses rely on rewrite-target or ImplementationSpecific, which would size the breakage from lowering the risk level.
