# Argo CD vs Flux for an Air-Gapped, Multi-Tenant Private Cloud

**Date:** 2026-11-24
**Question:** For an air-gapped, multi-tenant private cloud with 40 Kubernetes clusters, LDAP/AD SSO and on-prem GitLab, which fits better: Argo CD or Flux, and why?
**Versions examined:** Argo CD `v3.6.2`, Flux `v2.10.1`, argocd-agent `v0.11.0`, Flux Operator `v0.63.1` (latest tags on 2026-11-24, read with `git ls-remote --tags`)

## Method and sources

I cloned the upstream repositories and read the docs and manifests at the pinned refs below. Every claim in this note cites one of them. Paths are relative to each repo root.

| Key | Repository | Ref read |
|-----|------------|----------|
| `[argo]` | github.com/argoproj/argo-cd | tag `v3.6.2` |
| `[agent]` | github.com/argoproj-labs/argocd-agent | `main` @ `d837594df0` (2026-11-23) |
| `[flux2]` | github.com/fluxcd/flux2 | tag `v2.10.1` |
| `[fluxdocs]` | github.com/fluxcd/website (source of fluxcd.io) | `main` @ `8692e419ef` (2026-11-09) |
| `[kc]` / `[sc]` / `[nc]` | github.com/fluxcd/{kustomize,source,notification}-controller | `main` @ `9ed68b7924` / `dfa2ee0aba` / `bbecb4448d` |
| `[fop]` | github.com/controlplaneio-fluxcd/flux-operator | `main` @ `cb3cc0de38` (2026-11-22) |
| `[dex]` | github.com/dexidp/website | `main` @ `1adca06761` |

## TL;DR

**The default choice for this brief is Argo CD (hub-and-spoke, one HA instance or a few sharded ones).** The deciding factor is that "multi-tenant + LDAP/AD SSO" usually means tenants need a self-service UI and API with per-team permissions. Argo CD ships that built in: Dex is bundled with an LDAP connector, AD groups map to RBAC roles, AppProjects scope tenants, and one pane covers all 40 clusters. Flux has none of this in its core. Its UI comes from the separately licensed (AGPL-3.0), per-cluster Flux Operator Web UI, which only speaks OIDC, so you would run your own Dex or Keycloak in front of AD anyway.

**Choose Flux instead if** tenants will work only through GitLab merge requests and nobody needs a GitOps UI with AD logins. Flux also wins if security policy rules out a central component that holds API credentials for all 40 clusters. In that case Flux's per-cluster pull model, its GA Kubernetes-native impersonation for tenants, its documented air-gap procedure and its Cosign-verified OCI artifacts are the better fit.

**What tips the decision:**

- **Argo CD's multi-tenancy hardening is not all stable yet.** Sync impersonation is Beta, and both controller sharding algorithms are Alpha.
- **The argocd-agent pull model is still pre-1.0.** It removes the "hub holds every cluster's credentials" concern, but it is at v0.11 in argoproj-labs.

## 1. Requirement-by-requirement comparison

| Requirement | Argo CD 3.6 | Flux 2.10 |
|-------------|-------------|-----------|
| LDAP/AD SSO | Built in: Argo CD "embeds and bundles Dex", and Dex supports LDAP. | Core Flux has no UI and no login. The Flux Operator Web UI takes OIDC; for LDAP you deploy Dex yourself. |
| Tenant RBAC | Argo CD RBAC on SSO groups, plus AppProjects; Apps-in-any-namespace. | Kubernetes RBAC via `serviceAccountName` impersonation plus a lockdown flag set. |
| Least-privilege sync | Sync impersonation is **Beta**. | Impersonation is the core authorization model and is GA. |
| 40 clusters, one view | Native hub: one UI/API across registered clusters. | One Flux per cluster (or a hub using `.spec.kubeConfig`); the Web UI is per cluster. |
| Scale-out | Controller sharding: round-robin and consistent-hashing both **Alpha**. | Label-key sharding; replicas are standbys only. |
| Hub credential exposure | Hub stores a bearer token for each cluster (argocd-agent v0.x mitigates this). | None in per-cluster mode. |
| Air-gap install | Mirror 4 images; private CA via `argocd-tls-certs-cm`. | An official air-gapped guide; `flux bootstrap git --registry`. |
| On-prem GitLab | Webhooks, plus AppSet SCM/PR generators with `api:` and `caRef`. | `flux bootstrap gitlab --hostname`, a `gitlab` Receiver, commit-status and MR-comment providers. |
| Artifact integrity | Git GPG only (via `sourceIntegrity`). | Cosign verification on `OCIRepository`. |
| License of the UI | Apache-2.0 (part of Argo CD). | Flux Operator is AGPL-3.0. |

Detail and citations follow.

## 2. Identity: LDAP / Active Directory SSO

**Argo CD.** The docs offer two SSO paths. One is the "Bundled Dex OIDC provider - use this option if your current provider does not support OIDC (e.g. SAML, LDAP)", and the docs add that "Argo CD embeds and bundles Dex as part of its installation". The other is an existing OIDC provider. `[argo] docs/operator-manual/user-management/index.md` (lines 134-149)

- **Group mapping.** RBAC groups are "populated from the values returned by the OIDC provider under the configured scopes". `scopes` defaults to `[groups]`. `[argo] docs/operator-manual/rbac.md` (lines 52-53, 412-415)
- **Dex and AD.** The Dex LDAP connector documents a worked "Searching a Active Directory server with groups" example, `rootCA`/`rootCAData` for an internal CA, and nested-group resolution via `recursionGroupAttr`. `[dex] content/docs/connectors/ldap.md` (lines 91-94, 320-366)
- **Upgrade caveat.** Dex v2.39.0 made LDAP username/password validation "much more strict". `[argo] docs/operator-manual/upgrading/2.12-2.13.md` (line 47)
- **Dex has no HA.** "The `argocd-dex-server` uses an in-memory database, and two or more instances may have inconsistent data", so you run one Dex replica. `[argo] docs/operator-manual/high_availability.md` (line 280)
- **Distinguished-name quoting.** If the IdP passes AD groups as full DNs, they need quoting in `policy.csv`. `[argo] docs/operator-manual/user-management/openunison.md` (line 60)

**Flux.** Core Flux exposes no API or UI of its own. Tenants interact through Git and OCI, and "Flux acts as a proxy between users and the Kubernetes API". `[fluxdocs] content/en/flux/installation/configuration/multitenancy.md`

- **Where the UI comes from.** The Flux project points to the Flux Operator Web UI, from ControlPlane, as ecosystem news. `[fluxdocs] content/en/blog/2026-02-23-announcing-flux-v2.8.0/index.md` (lines 33-34, 94-111)
- **Default access.** That UI "by default ... exposes the Web UI without authentication, providing read-only access to all Flux resources in the cluster". `[fop] docs/web/web-user-management.md`
- **SSO.** SSO is "via OIDC & Kubernetes RBAC". `[fluxdocs]` v2.8.0 post (line 109)
- **LDAP needs Dex.** The Dex guide states that "the complete list of supported connectors can be found in the Dex documentation", so LDAP/AD means deploying and operating Dex yourself. `[fop] docs/web/web-sso-dex.md` (line 11)
- **Scope.** The documented install is per cluster: the UI is exposed "by the `flux-operator` Kubernetes Service of type `ClusterIP`". `[fop] docs/web/web-ingress.md` (line 9). I found no documented multi-cluster aggregated view in `[fop] docs/web` or `docs/guides` (searched for fleet / hub / multi-cluster).
- **License.** The Flux Operator is "licensed under the AGPL-3.0 license". `[fop] README.md` (lines 228-231). Flux itself is Apache-2.0 `[flux2] LICENSE`. Have legal review this before relying on it in a private cloud product.

**Verdict:** Argo CD fits better. AD SSO with group-to-role mapping comes out of the box across all clusters. With Flux you would need roughly 40 UIs, each behind your own OIDC broker.

## 3. Multi-tenancy model

**Argo CD.**

- **Tenant boundary.** AppProjects are the tenant boundary.
- **Apps in any namespace (since 2.5).** Teams can own `Application` objects in their own namespaces. A namespace must be enabled with `--application-namespaces` and listed in the AppProject's `.spec.sourceNamespaces`. This "allows ordinary Argo CD users ... to use patterns like declarative management of Application resources ... without the risk of a privilege escalation". It requires a cluster-scoped install. `[argo] docs/operator-manual/app-any-namespace.md`
- **Shared privileges by default.** "application syncs in Argo CD have the same privileges as the Argo CD control plane". AppProjects alone are "not secure enough and if Argo CD is compromised, attackers will easily gain `cluster-admin` access". The fix is sync impersonation (`AppProject.spec.destinationServiceAccounts`), which is disabled by default. `[argo] docs/operator-manual/app-sync-using-impersonation.md`
- **Impersonation maturity.** The feature is marked **Beta**. The feature-maturity table lists it as introduced in v2.13.0, while the page banner says "Beta Feature (Since v3.5.0)". `[argo] docs/operator-manual/feature-maturity.md`. The docs warn not to rely on Alpha/Beta features in production "especially if you do not have control over the Argo CD upgrades".
- **Cluster scoping.** Cluster secrets "may optionally carry a project field, which scopes the cluster to a single AppProject". `[argo] docs/operator-manual/rbac.md` (line 323)

**Flux.**

- **Authorization model.** Flux "defers to Kubernetes' native RBAC". Controllers impersonate the `.spec.serviceAccountName` of each `Kustomization`/`HelmRelease`.
- **Lockdown.** The documented lockdown patches set `--no-cross-namespace-refs=true`, `--no-remote-bases=true` and `--default-service-account=default`, so that "a tenant can't use another tenant's sources or subscribe to their events". `[fluxdocs] content/en/flux/installation/configuration/multitenancy.md`
- **Remote clusters.** With `.spec.kubeConfig` plus `.spec.serviceAccountName`, "the controller will impersonate the ServiceAccount on the target cluster". `[kc] docs/spec/v1/kustomizations.md` (lines 1014-1040)
- **Who is gated.** Flux gates *Git authors* by Kubernetes RBAC. It does not gate *UI users*: there is no Flux-side user identity.

**Verdict:**

- **Flux** has the stronger and more mature isolation primitive: impersonation is the core model, not a Beta add-on.
- **Argo CD** has the richer tenant self-service (UI, CLI, API, per-project roles, sync windows, project-scoped clusters).

For a private cloud that offers GitOps *as a service* to tenants, Argo CD's model is the one tenants can actually use.

## 4. Topology and scale for 40 clusters

**Argo CD hub.**

- **Sharding.** One control plane can register all 40 clusters. When a controller "is managing too many clusters", shard by raising `argocd-application-controller` replicas and setting `ARGOCD_CONTROLLER_REPLICAS`. `--sharding-method` offers `round-robin` and `consistent-hashing`, and both are labelled "an experimental feature". The legacy default and manual `shard` pinning in the cluster secret remain. `[argo] docs/operator-manual/high_availability.md` (lines 116-178)
- **Maturity.** The maturity table lists round-robin (v2.8), Dynamic Cluster Distribution (v2.9) and consistent-hashing (v2.12) as **Alpha**. `[argo] docs/operator-manual/feature-maturity.md`
- **Credential concentration.** "Argo CD stores the credentials of the external cluster as a Kubernetes Secret in the argocd namespace. This secret contains the K8s API bearer token". `[argo] docs/operator-manual/security.md` (lines 126-132). In this design the hub holds the keys to all 40 clusters.

**Argo CD pull model (argocd-agent).**

- **Design.** It inverts the connection: "agents reach back to a central hub". It offers "Managed" and "Autonomous" modes and markets itself as "Air-Gap Ready". `[agent] README.md`
- **Maturity.** It lives in `argoproj-labs`, not `argoproj`, at **v0.11.0**. "Principal HA & Replication is currently in Beta" `[agent] docs/configuration/ha.md`, and agent self-registration "is currently in beta state and may have rough edges" `[agent] docs/configuration/reference/principal.md` (lines 375-378).
- **Recommendation.** Treat it as a pilot candidate for 2026, not the baseline.

**Argo CD per-cluster alternative.** "Argo CD Core" runs headless, without RBAC, API, notifications or OIDC. `[argo] docs/operator-manual/core.md`. That gives up exactly the features that make Argo CD attractive here.

**Flux.**

- **Topology.** The natural topology is one Flux per cluster, each pulling from GitLab or OCI, so no central component holds cluster credentials. A hub is possible via `.spec.kubeConfig` (`secretRef`, or the recommended `configMapRef` with workload identity). `[kc] docs/spec/v1/kustomizations.md` (lines 1014-1030)
- **Scaling.** Sharding is by `sharding.fluxcd.io/key` label. "Extra replicas of a Flux controller are failover standbys ... they don't add capacity". Sharding is aimed at "tens of thousands of applications". `[fluxdocs] content/en/flux/installation/configuration/sharding.md`
- **Fleet view.** You need 40 bootstraps plus an aggregation layer, for example Prometheus/Grafana (`[fluxdocs] content/en/flux/monitoring/metrics.md`) or notification `Alert`s.

## 5. Air-gap operations

**Argo CD.**

- **Images.** The `v3.6.2` install manifests (`manifests/install.yaml`, `manifests/ha/install.yaml`) pull four images: `quay.io/argoproj/argocd:v3.6.2`, `ghcr.io/dexidp/dex:v2.46.0`, `public.ecr.aws/docker/library/redis:8.10.1-alpine`, and `public.ecr.aws/docker/library/haproxy:3.0.8-alpine` for HA. Mirror them and rewrite with Kustomize or Helm. Argo CD has no dedicated air-gap guide; this is the standard mirror-and-override procedure.
- **Internal CA.** Self-signed or internal-CA Git servers are configured per server in `argocd-tls-certs-cm`: "TLS certificates are configured on a per-server, not on a per-repository basis". `[argo] docs/user-guide/private-repositories.md` (lines 316-393)
- **Registry sources.** OCI images are supported as an application source. `[argo] docs/user-guide/oci.md`

**Flux.**

- **Official guide.** Flux has one: "Flux can be installed on air-gapped environments where the Kubernetes cluster, the container registry and the Git server are not connected to the internet". It lists images with `flux install --export | grep ghcr.io`, copies them with `crane`, then runs `flux bootstrap git --registry=registry.internal/fluxcd ...`, with `--registry-creds`/`--image-pull-secret` for authenticated registries. `[fluxdocs] content/en/flux/installation/configuration/air-gapped.md`
- **Gap in the guide.** The guide's image list omits `source-watcher`. In v2.10 that component is an *optional extra* (`ComponentsExtra`), so it only needs mirroring if you enable it. `[flux2] pkg/manifestgen/install/options.go` (lines 46-47)
- **Internal CA.** `GitRepository` secrets accept a `ca.crt` key. `[sc] docs/spec/v1/gitrepositories.md` (lines 164-188)
- **Signed OCI artifacts.** `OCIRepository.spec.verify` checks Cosign signatures. `[sc] docs/spec/v1/ocirepositories.md` (lines 611-668). This suits air-gapped estates that promote artifacts into an internal registry such as Harbor.
- **Argo CD's equivalent.** Argo CD's `sourceIntegrity` supports only "Git GnuPG verification", and the legacy GPG feature "is deprecated". `[argo] docs/user-guide/source-integrity.md`, `docs/user-guide/gpg-verification.md`

**Verdict:** Both work fully offline. Flux has the documented procedure and the stronger supply-chain verification for registry-promoted artifacts.

## 6. On-prem GitLab integration

**Argo CD.**

- **Webhooks.** Argo CD accepts GitLab webhooks via `webhook.gitlab.secret`. `[argo] docs/operator-manual/webhook.md` (lines 10, 60, 93)
- **SCM Provider generator.** The ApplicationSet generator "uses the GitLab API to scan ... either gitlab.com or self-hosted GitLab". It takes `api: https://gitlab.example.com/`, `includeSubgroups`, `topic`, `tokenRef`, and `caRef` pointing at `argocd-tls-certs-cm` for internal CAs. `[argo] docs/operator-manual/applicationset/Generators-SCM-Provider.md` (lines 90-140)
- **Merge-request previews.** The Pull Request generator also supports GitLab. `[argo] docs/operator-manual/applicationset/Generators-Pull-Request.md`
- **Tenant onboarding.** Together, ApplicationSets can turn "every project in a GitLab group" into Applications across the 40 clusters.

**Flux.**

- **Bootstrap.** Bootstrap against self-managed GitLab uses `--hostname`, and `--ssh-hostname` with `--token-auth=false` for SSH. `[fluxdocs] content/en/flux/installation/bootstrap/gitlab.md` (lines 80-93)
- **Events.** notification-controller has a `gitlab` Receiver type `[nc] docs/spec/v1/receivers.md` (lines 130, 396). It also offers a `gitlab` commit-status Provider and a `gitlabmergerequestcomment` Provider `[nc] docs/spec/v1beta3/providers.md` (lines 126, 137, 2072). Flux 2.8 introduced the MR-comment provider for preview environments `[fluxdocs]` v2.8.0 post (lines 119-125).

**Verdict:** Parity for day-to-day GitOps. Argo CD is ahead on GitLab-driven tenant onboarding through the SCM Provider generator.

## 7. Version currency and support windows

- **Argo CD 3.6** is tested against Kubernetes v1.34-v1.37. `[argo] docs/operator-manual/tested-kubernetes-versions.md`
- **Flux 2.10** supports Kubernetes 1.35-1.37 and OpenShift 4.22. "Flux v2.7 has reached end-of-life". `[fluxdocs] content/en/blog/2026-10-26-announcing-flux-v2.10.0/index.md` (lines 367-376)
- **Flux 2.10's headline feature** is SPIFFE integration (RFC-0014) for short-lived credentials between controllers and external systems. `[fluxdocs]` v2.10.0 post (lines 40-46). This is relevant if the private cloud already runs SPIRE.

## 8. Recommendation

**Pick Argo CD when:**

- Tenants need a UI or CLI with AD logins and per-team permissions.
- The platform team wants one pane over all 40 clusters.
- You want GitLab-group-driven onboarding through ApplicationSets.

**Mitigations to plan for:**

1. **Hub HA and sharding.** Deploy the HA manifests. Start with the default or manual cluster-to-shard assignment, because both automatic algorithms are Alpha. With 40 clusters, a handful of controller replicas with pinned `shard` values stays manageable.
2. **Least privilege.** Enable Apps-in-any-namespace and AppProject-scoped clusters. Pilot sync impersonation (Beta) per project before relying on it.
3. **Credential blast radius.** Network-isolate the hub and use per-cluster `argocd-manager` tokens that you rotate. Track argocd-agent (v0.x, Beta HA) as the path to a pull model, or split into 2-3 Argo CD instances per security zone.
4. **Dex.** Run a single replica, as its store is in-memory. Configure the AD `groupSearch` with `rootCA` set to your internal CA.

**Pick Flux when:**

- Tenants interact only via GitLab MRs.
- Security forbids a central holder of cluster credentials.
- The estate is OCI-artifact-promotion based and you want Cosign verification at the cluster.

**Mitigations to plan for:**

- Budget for a separate UI and SSO layer: the Flux Operator Web UI (AGPL-3.0) behind your own Dex/Keycloak on each cluster.
- Build fleet-level observability yourself.

**Hybrid option.** Some estates run Flux for the platform layer (CRDs, policy, ingress) on every cluster, and Argo CD as the tenant-facing delivery tool. Neither project documents this combination as a pattern; it is an inference from the capabilities above, not a sourced recommendation.

## 9. Limits of this note

- **Docs only.** No benchmarks were run. The scale statements come from the projects' own docs, not from measurements.
- **Pinned refs.** Flux website and Flux Operator docs were read at `main` (dated above), not at a release tag.
- **Not covered:**
  - commercial distributions (Akuity, Red Hat OpenShift GitOps, ControlPlane Enterprise for Flux)
  - CNCF governance status
  - any secondary write-ups
