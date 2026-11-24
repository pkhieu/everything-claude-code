# Argo CD vs Flux: Multi-Tenancy and Multi-Cluster Management at ~40 Clusters (state as of Nov 2026)

Research date: 2026-11-24. Docs were read from the "stable"/"latest" doc trees, which by then reflected Argo CD 3.6 and Flux 2.10. Several pages were unavailable (404) or redirected when fetched; those are listed under Gaps. GitHub API access was blocked in this session, so release data comes from the rendered GitHub releases pages.

## How does each tool isolate tenants, and what is GA vs beta/alpha?

### Takeaway
Argo CD isolates tenants inside one shared control plane. AppProjects restrict which repos, destinations and resource kinds a team can use, and RBAC roles are scoped per project. By default every sync still runs as the controller's own highly privileged service account. Per-project impersonation (`destinationServiceAccounts`) is opt-in and was still **beta** as of v3.5/3.6. Flux delegates isolation to Kubernetes RBAC: each Kustomization or HelmRelease is applied by impersonating a ServiceAccount in the tenant's namespace. Cluster-wide lockdown flags enforce this, and none of them is labelled experimental. The model is native to Flux, but you have to switch it on at bootstrap.

### Cited Findings
**Argo CD**
- AppProject `sourceRepos` limits which Git repos apps may deploy from. It supports `*` and `**` wildcards and `!` negation, and a repo is valid only if an allow rule matches and no deny rule matches. — [Argo CD Projects](https://argo-cd.readthedocs.io/en/stable/user-guide/projects/)
- AppProject `destinations` limits target clusters and namespaces. Namespace-scoped resources are restricted with a deny list and cluster-scoped resources with an allow list. Cluster-scoped entries can match by name, for example `team1-*` Namespaces. — [Argo CD Projects](https://argo-cd.readthedocs.io/en/stable/user-guide/projects/)
- Project roles follow the format `proj:<project>:<role>` and map to OIDC groups. They can issue JWT tokens, with or without expiry, that can be revoked. — [Argo CD Projects](https://argo-cd.readthedocs.io/en/stable/user-guide/projects/)
- A `project` field on a repository or cluster Secret scopes that repo or cluster to one project. `permitOnlyProjectScopedClusters: true` restricts apps to the project's own clusters. Apps and ApplicationSets that use templated projects cannot use project-scoped repositories. — [Argo CD Projects](https://argo-cd.readthedocs.io/en/stable/user-guide/projects/)
- The Projects page gives no maturity label for any AppProject feature. AppProjects are a long-standing core API. — [Argo CD Projects](https://argo-cd.readthedocs.io/en/stable/user-guide/projects/)
- **Apps in any namespace** arrived in v2.5. An admin enables it with `application.namespaces` in `argocd-cmd-params-cm` or the `--application-namespaces` flag on both argocd-server and the application-controller, and it accepts globs and regex. The Application's AppProject must also list the namespace in `.spec.sourceNamespaces`. — [Apps in any namespace](https://argo-cd.readthedocs.io/en/stable/operator-manual/app-any-namespace/)
- Apps in any namespace requires a cluster-scoped Argo CD install, and annotation-based resource tracking is recommended. The docs warn: never add user-controlled namespaces to privileged projects such as `default`, and never grant the `argocd` namespace through `sourceNamespaces`. RBAC must use `project/namespace/app`. — [Apps in any namespace](https://argo-cd.readthedocs.io/en/stable/operator-manual/app-any-namespace/)
- The current page carries no alpha/beta label for apps in any namespace. One limitation remains: an ApplicationSet in one namespace cannot generate Applications in another (issue #11104). — [Apps in any namespace](https://argo-cd.readthedocs.io/en/stable/operator-manual/app-any-namespace/)
- **App sync using impersonation** was introduced in **v3.5.0** and the docs call it "**beta-quality**": the API is considered stable, but the implementation may change. It is disabled by default and is enabled system-wide with `application.sync.impersonation.enabled: 'true'` in `argocd-cm`. — [App sync using impersonation](https://argo-cd.readthedocs.io/en/stable/operator-manual/app-sync-using-impersonation/)
- With impersonation on, each AppProject maps destination server and namespace pairs to a service account via `.spec.destinationServiceAccounts`, and the first match wins. Enforcement is on by default, so a sync with no matching service account fails. Setting `application.sync.impersonation.enforced: 'false'` falls back to the controller's service account, and the docs warn this weakens isolation. — [App sync using impersonation](https://argo-cd.readthedocs.io/en/stable/operator-manual/app-sync-using-impersonation/)
- argocd-agent v0.11.0 (2026-11-11) rewrites AppProject `destinationServiceAccounts` for agents and translates AppProject roles in autonomous mode. — [argocd-agent releases](https://github.com/argoproj-labs/argocd-agent/releases)

**Flux**
- Flux uses Kubernetes RBAC. By default its controllers run under a service account bound to `cluster-admin`. They can impersonate the ServiceAccount named in a Kustomization's or HelmRelease's `.spec.serviceAccountName`. — [Flux multi-tenancy lockdown](https://fluxcd.io/flux/installation/configuration/multitenancy/)
- By default a Kustomization apply runs as cluster admin. Setting `.spec.serviceAccountName` constrains it, for example to a namespace-scoped Role. — [Flux Kustomization API](https://fluxcd.io/flux/components/kustomize/kustomizations/)
- Lockdown flags:
  - `--no-cross-namespace-refs=true` applies to kustomize-, helm-, notification-, image-reflector- and image-automation-controller and source-watcher. It stops tenants from using other tenants' sources or events.
  - `--no-remote-bases=true` applies to kustomize-controller only.
  - `--default-service-account=default` applies to kustomize-, helm-controller and source-watcher. Objects without a `serviceAccountName` then use the tenant namespace's `default` SA, which has no permissions.

  — [Flux multi-tenancy lockdown](https://fluxcd.io/flux/installation/configuration/multitenancy/)
- The lockdown is applied at bootstrap as kustomize JSON patches on the `gotk-components.yaml` Deployments. The `flux-system` Kustomization keeps `serviceAccountName: kustomize-controller` (cluster-admin) so platform admins can still provision tenants. — [Flux multi-tenancy lockdown](https://fluxcd.io/flux/installation/configuration/multitenancy/)
- source-watcher supports `--default-service-account` only from Flux **v2.10.0**. On older versions the flag fails as unknown. — [Flux multi-tenancy lockdown](https://fluxcd.io/flux/installation/configuration/multitenancy/)
- By default Flux aggregates `flux-view` and `flux-edit` into the built-in view, edit and admin ClusterRoles. A patch can remove them. — [Flux multi-tenancy lockdown](https://fluxcd.io/flux/installation/configuration/multitenancy/)
- The lockdown page labels none of these flags experimental or beta. — [Flux multi-tenancy lockdown](https://fluxcd.io/flux/installation/configuration/multitenancy/)
- Flux v2.10.0 (Oct 2026): "Object identity is generally available", and the `ObjectLevelWorkloadIdentity` feature gate was retired. Notification Event, Alert and Provider APIs moved to v1. The release also added SPIFFE mTLS between controllers, plus cross-namespace artifacts and tenant namespace provisioning for ArtifactGenerator. — [flux2 releases](https://github.com/fluxcd/flux2/releases)
- Flux Operator v0.62.0 (Oct 2026) enables multitenant impersonation for source-watcher. — [flux-operator releases](https://github.com/controlplaneio-fluxcd/flux-operator/releases)
- The Flux Operator ResourceSet (`fluxcd.controlplane.io/v1`) generates objects from templated inputs. Its documented example creates a Namespace, ServiceAccount and RoleBinding for each tenant. `spec.serviceAccountName` sets the SA used for reconciliation, the operator's `--default-service-account` enforces a default, and a dedicated least-privilege SA per tenant namespace is recommended. — [ResourceSet CRD](https://fluxoperator.dev/docs/crd/resourceset/)

### Inferences
- Argo CD's isolation is enforced by Argo CD itself (AppProject and RBAC policy in its API server and controller). Unless beta impersonation is enabled, the Kubernetes credentials used for syncs are the controller's own, usually cluster-admin on each destination. Flux's isolation is enforced by the Kubernetes API server through impersonation, which is closer to least privilege by construction.
- Argo CD offers a richer tenant experience out of the box: a shared UI, SSO, and project roles and tokens. Flux has no built-in multi-tenant UI or SSO in the core project. The Flux Operator has a Web UI with OIDC, according to its release notes. — [flux-operator releases](https://github.com/controlplaneio-fluxcd/flux-operator/releases)
- For strict isolation in Argo CD, the docs point to combining apps in any namespace, `sourceNamespaces`, project-scoped clusters, and beta impersonation with enforcement on.

### Gaps
- I found no explicit "GA" label for apps in any namespace on current docs. Older releases called it beta, but I did not verify this in this session.
- The Flux object-identity docs page returned 404, so the exact names of the object-identity lockdown flags (for example, defaults for decryption or kubeconfig SAs) are unverified.
- The Projects page did not document sync windows or the purpose of sourceNamespaces in detail.

## What are the multi-cluster topologies for each tool, and what credentials does each store centrally?

### Takeaway
The classic Argo CD setup is hub-and-spoke push. One Argo CD holds a cluster Secret (API credentials) for every spoke and needs network reach to each spoke's API server. argocd-agent (argoproj-labs, v0.11.0, still pre-1.0) inverts this: agents on the spokes dial out to a central "principal", so no spoke credentials are stored centrally. Flux is normally installed per cluster in a pull model, with each cluster pulling from Git or OCI. Hub-and-spoke is also possible via `.spec.kubeConfig`, where the hub then holds kubeconfigs or workload-identity config. ControlPlane's D2 reference architecture uses per-cluster Flux pulling signed OCI artifacts ("Gitless GitOps").

### Cited Findings
**Argo CD (central and agent)**
- Remote clusters are registered as cluster Secrets in the Argo CD namespace. These Secrets can carry a `project` field to scope them, and a `shard` field to pin them to a controller shard. — [Argo CD Projects](https://argo-cd.readthedocs.io/en/stable/user-guide/projects/); [Argo CD HA](https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/)
- argocd-agent architecture: a **principal** runs on the control-plane cluster and an **agent** runs on each workload cluster. At minimum, an Argo CD application-controller runs on every workload cluster, so reconciliation is local. — [argocd-agent architecture](https://argocd-agent.readthedocs.io/latest/concepts/architecture/)
- "The control plane does not need to store credentials for workload clusters"; workload clusters authenticate to the control plane instead. Agents always start the connection, and the control plane never connects to agents. — [argocd-agent architecture](https://argocd-agent.readthedocs.io/latest/concepts/architecture/)
- The argocd-agent transport is gRPC, using bidirectional messages over one connection. A permanent connection is not required, and no persistent storage or relational DB is mandatory. The docs acknowledge a possible scaling limit around etcd and the Kubernetes API on the principal, and intend Application backends to be pluggable. — [argocd-agent architecture](https://argocd-agent.readthedocs.io/latest/concepts/architecture/)
- Modes:
  - **Managed:** configuration flows from the control plane to the workload cluster.
  - **Autonomous:** configuration flows from the workload cluster to the control plane.
  - Both modes can be mixed in one deployment.

  — [argocd-agent agent modes](https://argocd-agent.readthedocs.io/latest/concepts/agent-modes/)
- In managed mode, the agent's application-controller may use a repo-server and Redis either on the control plane or locally. Using the control-plane ones creates a single point of failure for the workload cluster. This comes from a search snippet; the page returned 404 when fetched directly. — [argocd-agent managed mode](https://argocd-agent.readthedocs.io/latest/concepts/agent-modes/managed/)
- In autonomous mode, repository credentials are created and managed locally on each workload cluster and are not synced to the principal. Autonomous agents keep working if the principal cluster is lost. This also comes from a search snippet. — [argocd-agent repositories](https://argocd-agent.readthedocs.io/latest/user-guide/repository/)
- The argocd-agent docs say the project is "in active development with a stable core architecture" and that the docs "may be incomplete or outdated". No production-readiness claim is made. — [argocd-agent docs home](https://argocd-agent.readthedocs.io/latest/)
- Notable argocd-agent releases:
  - v0.9.0 (2026-06-04) added **hybrid** architecture, for moving gradually from push to agent pull inside one Argo CD instance, and a Helm chart for the principal.
  - v0.10.0 (2026-08-26) added SPIFFE/SPIRE integration, a TLS certificate blocklist for revoking agent access, and Grafana dashboards.
  - v0.11.0 (2026-11-11) added hot TLS cert reload and supports the Argo CD 3.6 stream.
  - v0.8.0 added principal-to-principal replication and active/passive HA, labelled **beta**, plus SBOMs and Redis TLS by default.

  — [argocd-agent releases](https://github.com/argoproj-labs/argocd-agent/releases)
- Red Hat OpenShift GitOps 1.19 documents an Argo CD Agent installation. Its principal only manages agents whose source namespaces match the allowed list. — [Red Hat OpenShift GitOps 1.19 Argo CD Agent installation](https://docs.redhat.com/en/documentation/red_hat_openshift_gitops/1.19/html-single/argo_cd_agent_installation)

**Flux**
- `.spec.kubeConfig` lets a Kustomization apply, health-check and prune on a **remote cluster**. There are two ways to supply credentials:
  - `secretRef`: a static kubeconfig Secret in the Kustomization's namespace, re-read on every reconcile so rotation is picked up.
  - `configMapRef`: the recommended, secret-less option using workload identity, with `provider` set to aws, azure, gcp or `generic` (generic needs `address`).

  — [Flux Kustomization API](https://fluxcd.io/flux/components/kustomize/kustomizations/)
- With `.spec.kubeConfig`, the impersonated ServiceAccount must exist on the **target** cluster, in a namespace with the same name as the Kustomization's namespace. A kubeconfig that depends on binaries or files inside the controller Pod probably won't work. — [Flux Kustomization API](https://fluxcd.io/flux/components/kustomize/kustomizations/)
- The D2 reference architecture is "Gitless GitOps". Desired state is shipped as OCI artifacts built in CI from Git, and production clusters pull versioned, signed artifacts and "never contact the Git server directly". It uses three repos: `d2-fleet` (clusters and tenants), `d2-infra` (add-ons and monitoring) and `d2-apps`. — [ControlPlane D2 reference architecture](https://fluxcd.control-plane.io/guides/d2-architecture-reference/)
- The Flux Operator (current v0.63.1, 2026-11-22) adds a Web UI with OIDC, an MCP server, and ResourceSet / ResourceSetInputProvider for templated fleet and tenant resources. — [flux-operator releases](https://github.com/controlplaneio-fluxcd/flux-operator/releases); [ResourceSet CRD](https://fluxoperator.dev/docs/crd/resourceset/)

### Inferences
- **Air-gapped context.** Classic Argo CD hub-and-spoke concentrates credentials for all 40 clusters, often cluster-admin tokens, in a single namespace and needs inbound API reach to every cluster. That makes the hub a high-value target. argocd-agent and per-cluster Flux both remove central cluster credentials and need only outbound connections from the spokes. For argocd-agent the connection goes to the principal; for Flux it goes to an in-network Git server or OCI registry. Air-gapped mirrors of the registry and Git are needed in all cases.
- The D2 OCI pattern suits air-gapped setups: one internal registry is the only distribution point, and artifacts can be signed and verified.
- argocd-agent is still in the argoproj-labs org at pre-1.0 (v0.11). Adopting it for 40 production clusters means accepting incubation-level maturity, although Red Hat ships a supported distribution in OpenShift GitOps 1.19.
- Flux hub-and-spoke via kubeConfig is possible, but in an on-prem, non-cloud environment it would need static kubeconfig Secrets or `generic` workload identity on the hub. That reintroduces centrally stored credentials.

### Gaps
- I could not fetch the full argocd-agent managed and autonomous mode pages (404), the D2 PDF, or Flux Operator multi-cluster docs. The D2 PDF holds the details on D2 topology, tenant lockdown and air-gap guidance.
- No first-party source in this session described Argo CD's exact cluster Secret credential types (bearer token, exec, TLS). This is well known but was not cited here.

## What are the documented scaling characteristics for ~40 clusters?

### Takeaway
Argo CD scales a central instance by sharding its application-controller StatefulSet by **cluster**, and by tuning processor counts and repo-server replicas. The newer round-robin and consistent-hashing shard algorithms are still labelled alpha/experimental. Neither tool documents an explicit cluster-count ceiling. Per-cluster Flux spreads the load naturally, one set of controllers per cluster. Flux's own sharding is only advised at "tens of thousands of applications", and extra replicas are failover only.

### Cited Findings
**Argo CD**
- To shard the controller, scale the `argocd-application-controller` StatefulSet and set `ARGOCD_CONTROLLER_REPLICAS` to the same count. A cluster can be pinned to a shard with the `shard` field in its cluster Secret. — [Argo CD HA](https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/)
- The `--sharding-method` options are `legacy` (UID-based, non-uniform), `round-robin` and `consistent-hashing` (bounded loads, less reshuffling). Round-robin and consistent-hashing appear under "Alpha Features" and are called experimental. With round-robin, removing the rank-0 cluster can reshuffle every cluster across shards. The docs ask for feedback on consistent-hashing before it is production-ready. — [Argo CD HA](https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/)
- Processor defaults are `--status-processors` 20, `--operation-processors` 10 and `--hydration-processors` 5. The docs' example for about 1000 apps is 50 status and 25 operation processors. — [Argo CD HA](https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/)
- Repo-server tuning: `--parallelismlimit` caps concurrent manifest generations. A monorepo with 50+ apps can slow generation. Raise `--repo-server-timeout-seconds` and scale the repo-server deployment as needed. The default `ARGOCD_EXEC_TIMEOUT` is 90s. — [Argo CD HA](https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/)
- Memory: shard when the controller uses too much memory. Set `GOMEMLIMIT` to about 80–90% of the container limit. `ARGOCD_APPLICATION_TREE_SHARD_SIZE` of about 100 is suggested. Increase `ARGOCD_GRPC_MAX_SIZE_MB` (default 200) at 3000+ apps. — [Argo CD HA](https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/)
- HA install: at least three nodes for anti-affinity and argocd-server at 3+ replicas. Redis is a disposable cache in HA mode with 3 servers or Sentinels. Dex is in-memory, so multiple instances may be inconsistent. — [Argo CD HA](https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/)
- The HA page gives no explicit cluster-count limits. — [Argo CD HA](https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/)
- Argo CD v3.6.0 (Nov 2026) brought performance work: partial JSON unmarshalling, configurable compression for cached manifests, fewer copies on refresh, and UI virtual scrolling and lazy loading. — [argo-cd releases](https://github.com/argoproj/argo-cd/releases)
- argocd-agent v0.10.0 added event buffering to reduce volume, and v0.7.4 fixed a kube-client QPS performance problem. — [argocd-agent releases](https://github.com/argoproj-labs/argocd-agent/releases)

**Flux**
- The vertical scaling guide targets clusters running "hundreds of applications". It suggests `--concurrent=10` on kustomize-, helm- and source-controller, `--requeue-dependency=5s`, and an example limit of 2000m CPU and 2Gi memory. — [Flux vertical scaling](https://fluxcd.io/flux/installation/configuration/vertical-scaling/)
- It also suggests in-memory kustomize builds (`--concurrent=20` with `/tmp` as a Memory emptyDir), Helm index caching flags, a 10Gi PVC for source-controller artifacts, and dedicated nodes. — [Flux vertical scaling](https://fluxcd.io/flux/installation/configuration/vertical-scaling/)
- Sharding is advised at "tens of thousands of applications". Each shard is its own set of source, kustomize and helm controllers, selected with `--watch-label-selector=sharding.fluxcd.io/key=shardN`. Notification-controller and source-watcher do not support sharding. Extra replicas are leader-elected standbys, not added capacity. — [Flux sharding](https://fluxcd.io/flux/installation/configuration/sharding/)

### Inferences
- At 40 clusters, a central Argo CD would typically need several controller shards. The stable default `legacy` algorithm distributes clusters unevenly, so manual `shard` pinning or the alpha algorithms would likely be used. The repo-server and Redis become shared bottlenecks across all tenants.
- Per-cluster Flux (or argocd-agent with local controllers) keeps each cluster's reconciliation load local. 40 clusters do not change the per-instance scaling profile. The operational cost moves to fleet lifecycle work: upgrading 40 installations, for which the Flux Operator's FluxInstance and D2 are intended.

### Gaps
- Neither project documents a tested maximum number of clusters per instance. I found no official benchmark numbers for "N clusters" in this session. The CNOE consistent-hashing benchmarks were referenced but not fetched.
- I found no documented scaling numbers for the argocd-agent principal.

## What are the current versions and release cadence in 2026?

### Takeaway
As of late November 2026:

| Project | Latest | Cadence | Support window |
| --- | --- | --- | --- |
| Argo CD | v3.6.2 (Nov 18); v3.6.0 GA was Nov 3 | Minor every 3 months | 3 most recent minors patched (3.4, 3.5, 3.6) |
| Flux | v2.10.1 (Nov 20); v2.10.0 was Oct 26 | ~3 minors per year, tied to Kubernetes | Last 3 minors |
| argocd-agent | v0.11.0 (Nov 11) | Roughly every 2–3 months | — |
| Flux Operator | v0.63.1 (Nov 22) | About monthly minors | — |

### Cited Findings
- Argo CD latest is **v3.6.2** (Nov 18), released alongside v3.5.8 and v3.4.14. v3.6.0 was released Nov 3 and v3.6.1 Nov 4. — [argo-cd releases](https://github.com/argoproj/argo-cd/releases)
- Argo CD ships a minor release every three months. The first RC comes 7 weeks before GA, and only the three most recent minors get patches. The 2026 schedule:
  - v3.4: GA May 5, 2026
  - v3.5: GA Aug 4, 2026
  - v3.6: GA Nov 3, 2026
  - v3.7: RC1 Dec 15, 2026, GA Feb 2, 2027

  — [Argo CD release process and cadence](https://argo-cd.readthedocs.io/en/stable/developer-guide/release-process-and-cadence/)
- Argo CD 3.6 highlights: many new health checks, ApplicationSet progressive sync metrics, signed hydrated commits (Alpha), and Harbor and DockerHub webhooks. — [argo-cd releases](https://github.com/argoproj/argo-cd/releases)
- Flux latest is **v2.10.1** (Nov 20), which fixes credential caching and ORAS registry auth. Earlier releases: v2.10.0 Oct 26, v2.9.0 Jun 30, v2.8.8 May 20. — [flux2 releases](https://github.com/fluxcd/flux2/releases)
- Flux minors ship "at least" every four months, about two weeks after each Kubernetes minor. The last three minors are supported with best-effort backports. A new Flux supports Kubernetes N-2. — [Flux releases](https://fluxcd.io/flux/releases/)
- argocd-agent 2026 releases: v0.7.0 (Feb 23), v0.8.0 (Apr 8), v0.9.0 (Jun 4), v0.10.0 (Aug 26), v0.11.0 (Nov 11). — [argocd-agent releases](https://github.com/argoproj-labs/argocd-agent/releases)
- Flux Operator releases: v0.57.0 (Jul 27) through v0.63.1 (Nov 22, 2026). — [flux-operator releases](https://github.com/controlplaneio-fluxcd/flux-operator/releases)

### Inferences
- Both core projects support three minors. Argo CD's quarterly cadence gives each minor about 9 months of support. Flux's roughly four-month cadence gives about 12 months. Air-gapped sites must mirror images and charts for each upgrade, so fleet upgrade tooling matters: Flux Operator FluxInstance, or Argo CD managing its own agents.

### Gaps
- The GitHub release headers omitted years. 2026 is inferred from asset timestamps and the docs schedule. The year on older Flux and Flux Operator tags is not certain.
- Both projects are CNCF graduated, but I did not verify this in this session because the CNCF pages were not fetched.
