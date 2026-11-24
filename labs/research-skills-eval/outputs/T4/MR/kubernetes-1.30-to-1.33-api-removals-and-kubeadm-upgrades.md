# Kubernetes 1.30 to 1.33: API Removals, Deprecations, and kubeadm Upgrade Requirements

**Date:** 2026-11-24
**Subject:** What APIs were removed or deprecated across the upgrade steps 1.30 to 1.31, 1.31 to 1.32 and 1.32 to 1.33, and what the official kubeadm upgrade docs require for each step
**Method:** Every claim below is traced to a first-party source owned by the Kubernetes project: the
`kubernetes/kubernetes` CHANGELOG files (the `# v1.3x.0` / "Changelog since v1.3(x-1).0" section of each), the
Deprecated API Migration Guide, the versioned kubeadm upgrade task pages from the `kubernetes/website`
release branches, the generated kubeadm v1beta4 config reference, and the release team's pre-release
"removals / sneak peek" blog posts. Blog posts were written before each release; where a blog and
the final CHANGELOG disagree, the CHANGELOG is treated as authoritative and the difference is called out.

## Sources

| ID | Source | Owner |
|----|--------|-------|
| [CL31] | `CHANGELOG/CHANGELOG-1.31.md`, section `# v1.31.0` / "Changelog since v1.30.0" — <https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md#v1310> | kubernetes/kubernetes |
| [CL32] | `CHANGELOG/CHANGELOG-1.32.md`, section `# v1.32.0` / "Changelog since v1.31.0" — <https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.32.md#v1320> | kubernetes/kubernetes |
| [CL33] | `CHANGELOG/CHANGELOG-1.33.md`, section `# v1.33.0` / "Changelog since v1.32.0" — <https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md#v1330> | kubernetes/kubernetes |
| [DEPGUIDE] | Deprecated API Migration Guide — <https://kubernetes.io/docs/reference/using-api/deprecation-guide/> (source: `content/en/docs/reference/using-api/deprecation-guide.md` on `kubernetes/website` `main`) | SIG Docs / API reviewers |
| [UPG30]..[UPG33] | "Upgrading kubeadm clusters", `content/en/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade.md` on branches `release-1.30` … `release-1.33` of `kubernetes/website`; rendered at <https://v1-31.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/>, `v1-32.docs…`, `v1-33.docs…` | SIG Cluster Lifecycle |
| [V1BETA4] | kubeadm Configuration (v1beta4), `content/en/docs/reference/config-api/kubeadm-config.v1beta4.md` (`release-1.33`) — <https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4/> | SIG Cluster Lifecycle (auto-generated from source) |
| [BLOG31] | "Kubernetes Removals and Major Changes In v1.31" (2024-07-19) — <https://kubernetes.io/blog/2024/07/19/kubernetes-1-31-upcoming-changes/> | Release team |
| [BLOG32] | "Kubernetes v1.32 sneak peek" (2024-11-08) — <https://kubernetes.io/blog/2024/11/08/kubernetes-1-32-upcoming-changes/> | Release team |
| [BLOG33] | "Kubernetes v1.33 sneak peek" (2025-03-26) — <https://kubernetes.io/blog/2025/03/26/kubernetes-v1-33-upcoming-changes/> | Release team |

PR numbers (for example `#127017`) are the ones the CHANGELOG entry links; each is a primary record of the change.

## TL;DR

- **Only one GA/beta REST API version stopped being served in this whole range:**
  `flowcontrol.apiserver.k8s.io/v1beta3` (FlowSchema, PriorityLevelConfiguration), removed in **v1.32**.
  The migration guide lists no removals for v1.31 or v1.33 [DEPGUIDE].
- Alpha API versions were dropped or replaced in every release (DRA `resource.k8s.io/v1alpha2` in 1.31,
  `coordination.k8s.io/v1alpha1` in 1.32, `admissionregistration.k8s.io/v1alpha1` ValidatingAdmissionPolicy in 1.33).
  Some carry "delete objects before upgrading" requirements.
- Main deprecations: Node `status.nodeInfo.kubeProxyVersion` (1.31), kubeadm config `v1beta3` (1.31),
  core **v1 Endpoints** (1.33, no removal planned), `resource.k8s.io/v1beta1` (1.33, removal targeted for 1.36),
  Pod `status.resize` (1.33).
- The official kubeadm upgrade page is **the same procedure for every step in this range**. The 1.31, 1.32 and 1.33
  pages differ only in one added sentence about package repositories (1.32) and a typo fix (1.33). None of them adds
  a version-specific "required action" note. The actual per-step kubeadm requirements are in the CHANGELOG
  urgent-upgrade notes and kubeadm entries, summarized per step below.

## 1. Removed REST API versions

| Removed in | API version | Resources | Replacement | Source |
|-----------|-------------|-----------|-------------|--------|
| v1.31 | — (no GA/beta API version removed) | — | — | [DEPGUIDE] (no v1.31 section) |
| **v1.32** | `flowcontrol.apiserver.k8s.io/v1beta3` | FlowSchema, PriorityLevelConfiguration | `flowcontrol.apiserver.k8s.io/v1` (available since v1.29). Existing persisted objects can be read through v1. Notable change: `spec.limited.nominalConcurrencyShares` defaults to 30 only when unspecified. An explicit 0 is no longer changed to 30. | [DEPGUIDE] "v1.32 / Flow control resources"; [CL32] API Change (`#127017`); announced in [BLOG31] "Looking ahead" and [BLOG32] "API removal" ("only a single API removal planned for v1.32") |
| v1.33 | — (no GA/beta API version removed) | — | — | [DEPGUIDE] (no v1.33 section) |

### Alpha API versions dropped or replaced (no deprecation period required for alpha)

| Release | Change | Required action stated | Source |
|---------|--------|------------------------|--------|
| v1.31 | DRA `resource.k8s.io` moved to a new, **incompatible** `v1alpha3` (replacing `v1alpha2`) | DRA drivers using the v1alpha2 kubelet gRPC API "are no longer supported and need to be updated" (marked ACTION-REQUIRED) | [CL31] API Change (`#125488`), Other (`#124316`) |
| v1.31 | kubeadm structured output `output.kubeadm.k8s.io/v1alpha2` removed | Use `v1alpha3` | [CL31] (`#124496`) |
| v1.32 | `coordination.k8s.io/v1alpha1` dropped, replaced by `coordination.k8s.io/v1alpha2` (LeaseCandidate) | "Old coordination.v1alpha1 types must be deleted before upgrade" | [CL32] API Change (`#127857`) |
| v1.32 | Classic DRA (`DRAControlPlaneController` gate) removed, so only structured parameters remain | If classic DRA was enabled, remove dependent workloads and make sure every `PodSchedulingContext` is gone **before upgrading**. They cannot be removed through the apiserver afterwards. | [CL32] API Change (`#128003`); background in [BLOG32] |
| v1.32 | DRA promoted to `resource.k8s.io/v1beta1`; `v1alpha3` still served | No action on upgrade. **Downgrade** 1.32 to 1.31 with DRA objects present is not supported (v1beta1 is the storage version). | [CL32] API Change |
| v1.33 | `admissionregistration.k8s.io/v1alpha1` ValidatingAdmissionPolicy / ValidatingAdmissionPolicyBinding removed | Use the GA `v1` API (promoted to GA in 1.30, `#123405` in CHANGELOG-1.30) | [CL33] Other (`#129207`) |
| v1.33 | Inactive serving code for `authentication.k8s.io/v1alpha1` removed | — | [CL33] (`#129186`) |

## 2. Deprecations (still served, scheduled or flagged for removal)

| Deprecated in | What | Status / removal target | Source |
|---------------|------|-------------------------|--------|
| v1.31 | Node `.status.nodeInfo.kubeProxyVersion` field (KEP-4004) | 1.31 promoted the `DisableNodeKubeProxyVersion` gate to beta/default-on. **1.32 reverted it to default-off** "to give a full year from deprecation announcement in 1.29". **1.33 turned it on by default**, so the kubelet no longer sets the field. [BLOG33] said the field "will be removed in v1.33", but the final 1.33 changelog only records the default flip, not removal of the field. | [BLOG31]; [CL31] API Change (`#123845`); [CL32] Deprecation (`#126720`); [CL33] Feature (`#129713`) |
| v1.31 | kubeadm config API `kubeadm.k8s.io/v1beta3` | v1beta4 enabled. v1beta3 "deprecated but will continue to be supported until version 1.34 or later". The `kube-system/kubeadm-config` ConfigMap is now stored as v1beta4. | [CL31] (`#125029`); [V1BETA4] "kubeadm v1.31.x and newer can be used to migrate from v1beta3 to v1beta4" |
| v1.31 | kube-scheduler non-CSI volume-limit plugins `AzureDiskLimits`, `CinderLimits`, `EBSLimits`, `GCEPDLimits` | Removed from defaults in 1.31, then **removed entirely in 1.32**. Replace with `NodeVolumeLimits`. | [CL31] Deprecation (`#124500`); [CL32] (`#124003`); [BLOG31] |
| v1.31 | PV annotation `volume.beta.kubernetes.io/mount-options` | Warning on create/update | [CL31] Deprecation (`#124819`) |
| v1.32 | ServiceAccount annotation `kubernetes.io/enforce-mountable-secrets` | Deprecated, "no removal deadline" | [CL32] Deprecation (`#128396`) |
| v1.33 | **core `v1` Endpoints API** (KEP-4974) | "Officially deprecated (though still fully supported). The API will not be removed". Use EndpointSlice. | [CL33] Deprecation (`#130098`); [BLOG33] |
| v1.33 | `resource.k8s.io/v1beta1` (DRA) | "Will be removed in 1.36. Use `v1beta2` instead." | [CL33] API Change (`#129970`) |
| v1.33 | Pod `status.resize` field | Deprecated and no longer set. Replaced by `PodResizeInProgress` / `PodResizePending` conditions. | [CL33] Deprecation (`#130733`) |
| v1.33 | Service annotation `service.kubernetes.io/topology-mode` | Will not go GA. Use `spec.trafficDistribution`. | [CL33] Deprecation (`#130742`) |
| v1.33 | `gitRepo` volume plugin | Disabled by default. Re-enable with `GitRepoVolumeDriver=true`. | [CL33] (`#129923`) |

### Other notable non-API removals by release (affect manifests/flags at upgrade)

- **v1.31** [CL31]: in-tree cloud provider code removed (`#124767`, `#124886`; [BLOG31]); CephFS (`kubernetes.io/cephfs`)
  and Ceph RBD (`kubernetes.io/rbd`) in-tree volume plugins removed, so apps need redeploying on the ceph-csi
  drivers (`#124544`, `#124546`); kubelet `--keep-terminated-pod-volumes` removed (`#122082`); `PersistentVolumeLabel`
  admission plugin removed (`#124505`); `kubectl exec POD COMMAND` without `--` removed.
- **v1.32** [CL32]: kube-controller-manager `--cloud-provider` accepts only `external` or empty (`#128197`); kubelet
  `--runonce` removed (`#126336`); many GA feature gates removed (for example `ValidatingAdmissionPolicy`, `KMSv2`, `ServerSideApply`).
- **v1.33** [CL33]: kube-apiserver `--cloud-provider` / `--cloud-config` removed (`#130162`); alpha Windows
  HostNetwork containers removed (`#130250`; [BLOG33]); `AppArmor`, `CPUManager`, `JobPodFailurePolicy` and other GA gates removed.

## 3. kubeadm upgrade requirements per minor-version step

### 3.0 What the official kubeadm upgrade page requires (all three steps)

Each versioned page [UPG31]/[UPG32]/[UPG33] gives the same baseline:

- Upgrade from `N-1.x` to `N.x` only; **"Skipping MINOR versions when upgrading is unsupported."** A 1.30 cluster
  must go 1.30 → 1.31 → 1.32 → 1.33.
- Prerequisites: read the release notes; static control plane and etcd pods or external etcd; back up important
  components; **swap must be disabled**.
- **Drain** each node before a minor kubelet upgrade. Match kubelet and kubeadm versions (an older kubelet within
  the skew is allowed). All containers restart after upgrade because the spec hash changes.
- Switch the `pkgs.k8s.io` package repository to the target minor version before upgrading packages.
- Order: first control plane node (`kubeadm upgrade plan` then `kubeadm upgrade apply vN.x`) → other control plane
  nodes (`kubeadm upgrade node`) → worker nodes (`kubeadm upgrade node`), with drain → upgrade kubelet/kubectl →
  `systemctl daemon-reload && systemctl restart kubelet` → uncordon on each node. CNI plugin upgraded manually.
- Addons (CoreDNS, kube-proxy) are upgraded only after **all** control plane instances are upgraded, so control
  planes must be upgraded sequentially.
- `kubeadm upgrade` renews kubeadm-managed certificates unless `--certificate-renewal=false` is set. Backups go to
  `/etc/kubernetes/tmp` and must be cleaned up by hand.
- `kubeadm upgrade --config` accepts an **`UpgradeConfiguration`** (v1beta4). `kubeadm upgrade` does not
  reconfigure a cluster.

Differences between the versioned pages (verified by diffing the branch sources):

- **1.30 → 1.31 page** [UPG30 vs UPG31]: removed the note that you must pass replacement component configs via
  `--config` when `upgrade plan` flags a manual upgrade; replaced the v1beta3 `--config` warning with "supports
  `--config` with a `UpgradeConfiguration` API type" (v1beta4); dropped the instructions for the
  `UpgradeAddonsBeforeControlPlane` gate (the gate was removed in 1.31, [CL31] `#124715`).
- **1.31 → 1.32 page** [UPG32]: adds only "If you don't see the version you expect to upgrade to, verify if the
  Kubernetes package repositories are used."
- **1.32 → 1.33 page** [UPG33]: typo fix only ("to to stay secure"). Procedure unchanged.

The linked node pages (`upgrading-linux-nodes.md`) and `change-package-repository.md` have the same length (109 and 207
lines) across release-1.31/1.32/1.33.

### 3.1 Step 1.30 → 1.31

From [UPG31] plus kubeadm and urgent entries in [CL31]:

- **kubeadm config v1beta4** is now the default and the in-cluster `kubeadm-config` ConfigMap is rewritten as
  v1beta4. Breaking field changes: `extraArgs` becomes a list of `name`/`value` pairs;
  `JoinConfiguration.discovery.timeout` becomes `timeouts.discovery`; `ClusterConfiguration.timeoutForControlPlane` becomes
  `timeouts.controlPlaneComponentHealthCheck`. Run `kubeadm config migrate` on v1beta3 files (`#125029`).
- With `--config` on upgrade subcommands, only `UpgradeConfiguration` is honoured. Init/Cluster/component configs
  passed there are deprecated and ignored [V1BETA4].
- `kubeadm upgrade apply/plan --feature-gates` is deprecated and a no-op. Edit `featureGates` in the
  `kube-system/kubeadm-config` ConfigMap instead (`#125797`).
- `UpgradeAddonsBeforeControlPlane` gate removed. Addons upgrade only after all control planes (`#124715`).
- **etcd must be ≥ 3.5.11.** kubeadm 1.31 probes `/livez` and `/readyz`, so a custom etcd older than 3.5.11 can no
  longer be deployed (`#124465`).
- kubeadm stopped shelling out to `crictl`. The packages still depend on `cri-tools` for 1.31, with notice that the
  dependency goes away in 1.32, so install `crictl` yourself if scripts need it (`#124685`).
- Hidden klog flags (`--log-dir`, `--logtostderr`, and others) are rejected (`#125179`); `--experimental-output`
  deprecated in favour of `--output` (`#124393`); `output.kubeadm.k8s.io/v1alpha2` removed (`#124496`).
- Cluster-wide urgent notes: custom scheduler plugins must implement QueueingHint for Pod/Update (`#122234`);
  kubelet `--keep-terminated-pod-volumes` removed; PVCs using alpha `RecoverVolumeExpansionFailure` with
  `ControllerResizeFailed`/`NodeResizeFailed` need `status.allocatedResourceStatus` cleared (`#126108`).
- No REST API version removals ([DEPGUIDE]), but CephFS/RBD in-tree volumes and in-tree cloud providers are gone (section 2).

### 3.2 Step 1.31 → 1.32

From [UPG32] plus [CL32]:

- [CL32] states: **"There are no urgent upgrade notes for the v1.32 release."**
- **Must migrate before upgrading:** any manifests or clients on `flowcontrol.apiserver.k8s.io/v1beta3` → `v1`
  ([DEPGUIDE]; `#127017`).
- Delete any `coordination.k8s.io/v1alpha1` objects before upgrading (`#127857`). If classic DRA was enabled, remove
  workloads and all `PodSchedulingContext` objects before upgrading (`#128003`).
- kubeadm removals: `kubeadm upgrade apply --feature-gates`; `kubeadm upgrade diff --api-server-manifest`,
  `--controller-manager-manifest` and `--scheduler-manifest` (`#127123`); `--experimental-output` (use `--output`) (`#126914`);
  `init kubelet-finalize experimental-cert-rotation` sub-phase (use `enable-client-cert-rotation`) (`#126913`).
- kubeadm upgrade gained phases (`kubeadm upgrade apply phase …`, `--skip-phases`; `upgrade node` adds `addon` and
  `post-upgrade` phases). **If you skipped an addon phase at `kubeadm init`, you must now skip the same addon on
  `kubeadm upgrade apply` and `kubeadm upgrade node`** (`#126032`, `#127242`).
- Preflight checks for `socat`, `ebtables` and `conntrack` removed (`#127151`, `#126953`). kubeadm no longer warns if
  `crictl` is missing (`#126596`).
- `EtcdLearnerMode` is GA and locked on (`#126374`).
- kube-scheduler config: remove explicit `AzureDiskLimits`/`CinderLimits`/`EBSLimits`/`GCEPDLimits` plugins (`#124003`).
- kube-controller-manager: `--cloud-provider` must be `external` or empty (`#128197`).

### 3.3 Step 1.32 → 1.33

From [UPG33] plus [CL33]:

- No REST API version removals ([DEPGUIDE]). Clients of `admissionregistration.k8s.io/v1alpha1` VAP must use `v1` (`#129207`).
- Urgent notes [CL33]: CSI drivers must not treat `IsLikelyNotMountPoint == false` as "is a mount point"
  (`#129370`); the `KUBE_PROXY_NFTABLES_SKIP_KERNEL_VERSION_CHECK` semantics changed (`#130401`); scheduler plugin
  authors must rename `UpdatePodTolerations` to `UpdatePodToleration` (`#129023`); new opt-in CrashLoopBackOff decay
  gate (`#130711`).
- kube-apiserver `--cloud-provider` / `--cloud-config` flags removed, so drop them from any kubeadm `extraArgs`
  (`#130162`).
- kubeadm changes: `ControlPlaneKubeletLocalMode` and `WaitForAllControlPlaneComponents` promoted to beta (default
  on) (`#129620`, `#129956`); `EtcdLearnerMode` gate removed, so delete it from
  `featureGates` (`#129589`); `kubeadm upgrade plan --etcd-upgrade` / `UpgradeConfiguration.plan.etcdUpgrade` added
  (`#130023`, [V1BETA4] "v1.33"); upgrade now runs kernel/OS-version preflight checks (`#129401`); disabled addons
  are skipped during upgrade (`#129418`); new preflight checks require `cp` (Linux), `xcopy` (Windows) and `losetup`;
  checks for `nsenter`, `ip`, `iptables`, `ethtool`, `tc` and `touch` removed.
- Workloads: migrate off core v1 Endpoints when convenient (deprecated, not removed). `gitRepo` volumes disabled by
  default. kubelet no longer populates `status.nodeInfo.kubeProxyVersion`.

## 4. Caveats and open points

- **kubeadm v1beta3 removal timing**: the 1.31 changelog says v1beta3 is supported "until version 1.34 or later".
  Nothing in [CL32]/[CL33] removes it, so v1beta3 files still work through 1.33. Migrating with `kubeadm config
  migrate` during the 1.31 step is still the safe path.
- **`cri-tools` package dependency drop in 1.32** was announced in [CL31]. [CL32] does not restate the packaging
  change, which lives in the separate `kubernetes/release` packaging specs and was not verified here.
- **kubeProxyVersion**: the [BLOG33] prediction of field removal did not match the shipped [CL33] entry (default flip
  only). Rely on the CHANGELOG.
- The kubeadm upgrade task page has no per-version "breaking changes" box in 1.31 to 1.33. Its only instruction for
  version-specific concerns is "Make sure you read the release notes carefully", which is why the per-step lists
  above come from the CHANGELOG.
