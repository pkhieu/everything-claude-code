# Argo CD vs Flux: Self-Managed GitLab Integration and Project Health (as of Nov 2026)

## How does each authenticate to self-managed GitLab (SSH, HTTPS tokens, deploy keys, custom CA)?

### Takeaway
Both support HTTPS tokens and SSH keys against a self-managed GitLab with a private CA. Flux has a GitLab-specific `flux bootstrap gitlab` command that creates the project and registers a deploy key or deploy token for you, using `--hostname` for self-managed instances. Argo CD uses generic repository Secrets, prefix-matched credential templates and a cluster-wide TLS/known-hosts ConfigMap.

### Cited Findings
**Argo CD**
- Repository Secrets take `username`/`password` for HTTPS, `sshPrivateKey` for SSH, and `tlsClientCertData`/`tlsClientCertKey` for HTTPS client certificates. The page defines no separate "token" key, so a GitLab token goes in `password`. — [Argo CD declarative setup](https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/)
- Credential templates are Secrets labelled `argocd.argoproj.io/secret-type: repo-creds`. One template covers every repository whose URL starts with a prefix such as `https://gitlab.example.com/group`, and the longest matching prefix wins. — [Argo CD declarative setup](https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/)
- Custom CA: add the PEM to `argocd-tls-certs-cm`, keyed by the GitLab hostname (not the URL). More than one certificate per host is allowed, which helps during rollover. SSH host keys must be listed in `argocd-ssh-known-hosts-cm`, or connections fail. — [Argo CD declarative setup](https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/)
- A per-repository `proxy`/`noProxy` setting is supported. Without it, the repo-server falls back to the proxy environment variables. — [Argo CD declarative setup](https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/)
- Gotcha: self-hosted GitLab may need the `.git` suffix in repository URLs. Without it GitLab answers with an HTTP 301, which Argo CD does not follow. — [Argo CD declarative setup](https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/)
- The ApplicationSet SCM and PR generators have their own TLS settings: `caRef` (a ConfigMap), `insecure`, or a CA mounted into the controller via `--scm-root-ca-path` / `ARGOCD_APPLICATIONSET_CONTROLLER_SCM_ROOT_CA_PATH` / `applicationsetcontroller.scm.root.ca.path`. — [Argo CD SCM Provider generator](https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-SCM-Provider/)

**Flux**
- `flux bootstrap gitlab --hostname=<self-managed host>` supports self-managed and Enterprise GitLab, including subgroups via `--owner=group/subgroup`. — [Flux bootstrap GitLab](https://fluxcd.io/flux/installation/bootstrap/gitlab/)
- Bootstrap needs a GitLab PAT with full read/write API access (`GITLAB_TOKEN`). The person running it must own the project or be an admin of the group. — [Flux bootstrap GitLab](https://fluxcd.io/flux/installation/bootstrap/gitlab/)
- Transport options:
  - `--token-auth` uses HTTPS with the PAT.
  - `--deploy-token-auth` creates a read-only GitLab project deploy token and stores it in the `flux-system` Secret.
  - The default SSH mode uses the PAT to register a deploy key, needs `--ssh-hostname`, and generates an ECDSA P-384 key.
  
  — [Flux bootstrap GitLab](https://fluxcd.io/flux/installation/bootstrap/gitlab/)
- Deploy keys are read-only by default. Image automation needs `--read-write-key=true`. To rotate a key, delete the `flux-system` Secret and run bootstrap again. — [Flux bootstrap GitLab](https://fluxcd.io/flux/installation/bootstrap/gitlab/)
- `flux bootstrap git` supports bootstrapping without a PAT, using a pre-registered deploy key. — [Flux bootstrap GitLab](https://fluxcd.io/flux/installation/bootstrap/gitlab/)
- In notification Providers, a CA is supplied through the `ca.crt` key and is added to the system trust store rather than replacing it. The GitLab provider also supports client certificates (mTLS) via `certSecretRef`. — [Flux notification providers](https://fluxcd.io/flux/components/notification/providers/)

### Inferences
- For a private-CA GitLab, Argo CD needs the CA configured in up to two places: `argocd-tls-certs-cm` for the repo-server, and the generator's `caRef` or mounted CA for the ApplicationSet controller. Flux configures the CA per object.
- Flux's bootstrap creates the deploy keys or deploy tokens itself. With Argo CD, the operator creates the credentials, unless they script it or use GitLab's tooling.

### Gaps
- I did not confirm the `--ca-file` flag for `flux bootstrap gitlab` or the GitRepository `certSecretRef` field in this pass, because the bootstrap page does not mention them.
- I found no source on whether Argo CD supports GitLab OIDC or workload-identity auth in place of static tokens.

## What webhook receivers and commit-status / MR notification integrations with GitLab exist?

### Takeaway
Both accept GitLab push webhooks. Flux ships native GitLab notification providers: `gitlab` sets commit status, and `gitlabmergerequestcomment` (added in v2.8) posts MR comments. Both work with self-hosted addresses. Argo CD has no dedicated GitLab notification service in its docs, so commit status to GitLab has to be built from the generic webhook notification service.

### Cited Findings
**Argo CD**
- The API server accepts GitLab webhooks at `/api/webhook`. The optional shared secret goes in `argocd-secret` under `webhook.gitlab.secret`. Payloads are treated as untrusted and only trigger a refresh. — [Argo CD webhook docs](https://argo-cd.readthedocs.io/en/stable/operator-manual/webhook/)
- `webhook.maxPayloadSizeMB` limits payload size (default 50MB). The handler does not tell branch events from tag events that share a name. — [Argo CD webhook docs](https://argo-cd.readthedocs.io/en/stable/operator-manual/webhook/)
- The ApplicationSet controller runs a separate webhook server, a ClusterIP service that needs its own Ingress. GitLab "Merge request events" requeue the PR generator on open, close, reopen, update and merge. — [Argo CD PR generator](https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Pull-Request/)
- I found no GitLab-specific notifications service page (it returned 404). The generic webhook service docs give a commit-status example for GitHub only (POST to `/repos/.../statuses/{revision}`). — [Argo CD notifications GitLab page (404)](https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/gitlab/); [Argo CD notifications webhook service](https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/)

**Flux**
- The Receiver `type: gitlab` checks the `X-Gitlab-Token` header against the Secret's `token`, filters on `X-Gitlab-Event` (for example `Push Hook`, `Tag Push Hook`), and reconciles the listed resources. The `webhook-receiver` Service has to be exposed through an Ingress. — [Flux receivers](https://fluxcd.io/flux/components/notification/receivers/)
- The Provider `type: gitlab` sets Git commit status. Self-hosted instances use the project URL as the address (or the project ID on v4-only APIs). It needs a Secret with key `token` (a personal, group or project access token with `api` scope) and supports a proxy and a cert Secret. — [Flux notification providers](https://fluxcd.io/flux/components/notification/providers/)
- The Provider `type: gitlabmergerequestcomment` posts or updates one status comment per Flux object on an MR. Objects need the `event.toolkit.fluxcd.io/change_request` annotation with the MR IID. It takes self-hosted addresses such as `https://gitlab.example.com/group/project` and needs the `api` scope. — [Flux notification providers](https://fluxcd.io/flux/components/notification/providers/)
- The Flux roadmap lists "Introduce `gitlabmergerequestcomment` notification provider" under v2.8. Flux v2.10 promoted the alerting APIs (Event, Alert, Provider) to v1. — [Flux roadmap](https://fluxcd.io/roadmap)
- GitLab's own Flux integration: the GitLab agent for Kubernetes finds Flux `GitRepository` objects that point at GitLab projects and configures a `Receiver` automatically, so a push triggers reconciliation. It is available on Free, Premium and Ultimate, and on GitLab.com, Self-Managed and Dedicated. Delivery is not guaranteed, so keep an interval. Immediate reconciliation covers public projects and the agent config project, not other private projects. The page does not mention Argo CD. — [GitLab docs: GitOps with Flux](https://docs.gitlab.com/user/clusters/agent/gitops/)

### Inferences
- Flux is better integrated for MR and commit feedback on self-managed GitLab. GitLab itself also documents and recommends Flux as its GitOps engine.
- With Argo CD on GitLab, teams write custom `argocd-notifications` webhook templates against the GitLab Commit Status API.

### Gaps
- I did not verify whether Argo CD notifications added a native GitLab service in 3.4–3.6.
- I did not check GitLab's own docs for an Argo CD integration page.

## What generators/automation exist for auto-discovering GitLab projects or merge requests?

### Takeaway
Argo CD has the richest discovery: the ApplicationSet SCM Provider generator scans GitLab groups and subgroups for projects, and the Pull Request generator creates preview environments per MR. Flux has no native repository or MR discovery. Its GitLab automation is image update automation, which can push and open GitLab MRs via push options.

### Cited Findings
- Argo CD's SCM Provider `gitlab` fields:
  - `group` (required), `api` (the self-hosted URL), and `includeSubgroups`.
  - `includeSharedProjects` (default true; the docs say most users want false).
  - `allBranches`, `topic` (one topic only, because of the GitLab API), and `includeArchivedRepos`.
  - `tokenRef`. Without it, access is anonymous, rate-limited and public-only.
  - `insecure` and `caRef`.
  
  — [Argo CD SCM Provider generator](https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-SCM-Provider/)
- Argo CD's Pull Request `gitlab` fields are `project` (an ID or full path), `api`, `tokenRef`, `labels`, `pullRequestState` (opened/closed/merged/locked), `insecure` and `caRef`. It can be driven by webhooks. — [Argo CD PR generator](https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Pull-Request/)
- Flux image update automation can push to a separate branch (`push.branch`) or to refspecs (`push.refspec`). GitLab push options such as `merge_request.create` and `merge_request.target: release` open an MR automatically. Commits can be signed with GPG or SSH keys. — [Flux ImageUpdateAutomation](https://fluxcd.io/flux/components/image/imageupdateautomations/)
- Flux Image Automation APIs and controllers reached GA in Flux 2.7 (September 30, 2025). — [Flux 2.7 GA blog](https://v2-9.docs.fluxcd.io/blog/2025/09/flux-v2.7.0/)
- Flux's receivers page has no GitLab Container Registry receiver. Registry receivers exist for Harbor, DockerHub, Quay, Nexus, ACR and GCR. — [Flux receivers](https://fluxcd.io/flux/components/notification/receivers/)

### Inferences
- For "one Application per GitLab project" or "a preview environment per MR" patterns on self-managed GitLab, Argo CD works out of the box. With Flux, you get the same result with external tooling or the Flux Operator's ResourceSets, which I did not verify here.
- For automated image bumps that open MRs in self-managed GitLab, Flux has a GA native feature. Argo CD needs the separate Argo CD Image Updater (status not verified here).

### Gaps
- I did not verify the Flux Operator ResourceSet "input providers" for GitLab MRs or branches, which could narrow the discovery gap.
- I did not verify the Argo CD Image Updater's 2026 status or its GitLab write-back support.

## What is the 2026 governance and maintenance state of each project (latest releases, CNCF graduation, key vendors, commercial support)?

### Takeaway
Both are CNCF Graduated (Flux on Nov 30, 2022; Argo on Dec 6, 2022) and both are actively released in 2026. Argo CD ships a minor release roughly every quarter, maintaining three minors with patches (3.6.2 is latest as of Nov 18, 2026). Flux shipped 2.8 in Feb, 2.9 in Jun and 2.10 in Oct 2026. After Weaveworks shut down, Flux is primarily sustained by ControlPlane, which employs core maintainers and sells an enterprise distribution.

### Cited Findings
**CNCF status**
- Flux graduation was announced Nov 30, 2022. — [CNCF announcement](https://cncf.io/announcements/2022/11/30/flux-graduates-from-cncf-incubator)
- Argo graduation was announced Dec 6, 2022. Argo had joined the Incubator in April 2020 and was used in production by more than 350 organizations at the time. — [CNCF announcement](https://www.cncf.io/announcements/2022/12/06/the-cloud-native-computing-foundation-announces-argo-has-graduated)

**Argo CD releases**
- The GitHub releases page shows v3.6.2 (Latest, 18 Nov), v3.5.8 and v3.4.14 (18 Nov), v3.6.1 (04 Nov) and v3.6.0 (03 Nov). Asset timestamps indicate 2026. Three minor lines are patched at the same time. — [Argo CD GitHub releases](https://github.com/argoproj/argo-cd/releases)
- 3.3 went GA in early 2026 after an RC in Dec 2025. It added PreDelete hooks and OIDC background token refresh. — [InfoQ](https://infoq.com/news/2026/02/argocd-33); [Argo CD 3.2→3.3 upgrade guide](https://argo-cd.readthedocs.io/en/stable/operator-manual/upgrading/3.2-3.3/)
- The 3.4 RC was announced Mar 17, 2026, with GA in early May 2026 (third-party sources). Features include cluster-scoped pause reconciliation and Helm value-file globs. — [apievangelist repost of RC](https://blogs.apievangelist.com/blogs/argo-2026-03-17-argo-cd-v34-release-candidate/); [dev.to deep dive](https://dev.to/x4nent/argo-cd-34-deep-dive-cluster-pause-reconciliation-helm-valuefiles-globs-source-hydrator-commit-3195); [Argo CD 3.3→3.4 upgrade guide](https://argo-cd.readthedocs.io/en/stable/operator-manual/upgrading/3.3-3.4/)
- Argo CD 3.0 was announced by the CNCF on Apr 1, 2025. — [CNCF announcement](https://www.cncf.io/announcements/2025/04/01/cloud-native-computing-foundation-announces-argo-cd-v3-update-to-enhance-scalability-and-security-for-kubernetes/)
- Octopus Deploy publishes Argo CD release coverage (for example, "Argo CD 3.3 is now generally available"), which shows its commercial involvement in Argo CD. — [Octopus blog](https://octopus.com/blog/argo-3.3)

**Flux releases**
- v2.8 GA was in Feb 2026 (Helm v4 support, server-side apply for Helm, cosign v3).
- v2.9 GA was Jun 30, 2026 (CLI plugin system, post-quantum Age decryption).
- v2.10 GA was Oct 26, 2026 (SPIFFE workload identity and inter-controller mTLS; alerting APIs promoted to v1).
- v2.11 is provisional for Q1 2027.

  — [Flux roadmap](https://fluxcd.io/roadmap); [Flux blog 2026](https://v2-9.docs.fluxcd.io/blog/); [Flux 2.8 GA](https://fluxcd.io/blog/2026/02/flux-v2.8.0/)
- Flux 2.7 GA was Sep 30, 2025, and patches ran to 2.7.5 (Nov 2025, per a third-party tracker). — [Flux 2.7 GA blog](https://v2-9.docs.fluxcd.io/blog/2025/09/flux-v2.7.0/); [endoflife.ai](https://endoflife.ai/flux/2.7)
- Other 2026 ecosystem activity:
  - "Flux turns 10!" (Jul 7, 2026).
  - Flux Mirror plugin (Aug 12, 2026).
  - flux9s TUI GA (Oct 5, 2026).
  - A Morgan Stanley scaling case study (Mar 15, 2026).
  - A Terraform bootstrap via Flux Operator post (Apr 28, 2026).
  
  — [Flux blog 2026](https://v2-9.docs.fluxcd.io/blog/)

**Flux after Weaveworks**
- ControlPlane hired Flux core maintainers after Weaveworks stopped supporting Flux, including Stefan Prodan (the search summary also named "Soule Ba"). It describes itself as Flux's main sponsor. — [ControlPlane post](https://control-plane.io/posts/controlplane-backs-the-cncf-flux-project-by-employing-maintainers/)
- The CNCF announced new corporate support for Flux on Mar 19, 2024. — [CNCF announcement](https://www.cncf.io/announcements/2024/03/19/cloud-native-computing-foundations-fluxcd-project-gains-new-corporate-support/)
- The ControlPlane Enterprise for Flux CD offering, as described in ControlPlane's own marketing:
  - Hardened controller images with SBOMs, synced to upstream.
  - 24/7 support from Flux maintainers.
  - Contractual CVE response, with backports to the last three minors.
  - The CPEF-1 tier (1 cluster or 10 nodes) listed at $1,250/month billed annually. Larger tiers are quote-based.
  
  — [ControlPlane Enterprise for Flux](https://fluxcd.control-plane.io/); [Pricing](https://fluxcd.control-plane.io/pricing/); [ControlPlane enterprise-flux page](https://control-plane.io/enterprise-flux/)
- The ControlPlane offering is also listed on AWS Marketplace and UK G-Cloud. — [AWS Marketplace](https://aws.amazon.com/marketplace/pp/prodview-ndm54wno7tayg); [G-Cloud](https://www.applytosupply.digitalmarketplace.service.gov.uk/g-cloud/services/382751477503439)
- Commentary on Flux's survival after Weaveworks. — [The New Stack: Why Flux isn't dying after Weaveworks](https://thenewstack.io/why-flux-isnt-dying-after-weaveworks/)

### Inferences
- The two projects release at similar speeds in 2026: Argo CD about every 3 months with three supported minors, Flux about every 4 months.
- Flux's vendor base is concentrated in ControlPlane, which is a bus-factor consideration. Argo CD's vendor ecosystem looks broader (Octopus/Codefresh, and others listed under Gaps), but this was not fully sourced here.
- For on-prem GitLab shops, GitLab's official documentation of Flux (on every tier, including Self-Managed) is a form of ecosystem backing for Flux.

### Gaps
- I did not source, in this pass, the list of Argo CD commercial vendors: Akuity, Red Hat OpenShift GitOps, Intuit (as the original maintainer), Octopus/Codefresh. I also did not source current Argo maintainer counts.
- I did not retrieve current Flux maintainer counts or organizational diversity numbers for 2026.
- I did not confirm the exact Flux 2.10.x latest patch as of Nov 2026, because GitHub API access was blocked in this session.
- I did not open ControlPlane's post. The maintainer names come only from a search summary, so verify on the linked post which maintainers ControlPlane hired, other than Stefan Prodan, before citing them.
