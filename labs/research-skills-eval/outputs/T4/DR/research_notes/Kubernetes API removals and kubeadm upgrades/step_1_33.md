# Kubernetes 1.32 -> 1.33 upgrade step: API removals/deprecations and kubeadm upgrade requirements

Source key (all claims below cite one of these):
- CL = CHANGELOG-1.33, section "v1.33.0 / Changelog since v1.32.0" (plus patch-release sections where noted): https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md
- DG = Deprecated API Migration Guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/ (source: https://github.com/kubernetes/website/blob/release-1.33/content/en/docs/reference/using-api/deprecation-guide.md)
- UP = Upgrading kubeadm clusters (v1.33 docs): https://v1-33.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/ (source: https://github.com/kubernetes/website/blob/release-1.33/content/en/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade.md)
- REL = Kubernetes v1.33 release blog: https://kubernetes.io/blog/2025/04/23/kubernetes-v1-33-release/
- PEEK = v1.33 sneak peek (deprecations/removals) blog: https://kubernetes.io/blog/2025/03/26/kubernetes-v1-33-upcoming-changes/
- KC = kubeadm constants, release-1.33 branch: https://github.com/kubernetes/kubernetes/blob/release-1.33/cmd/kubeadm/app/constants/constants.go ; at tag v1.33.0: https://github.com/kubernetes/kubernetes/blob/v1.33.0/cmd/kubeadm/app/constants/constants.go
- KF = kubeadm feature gates, release-1.33: https://github.com/kubernetes/kubernetes/blob/release-1.33/cmd/kubeadm/app/features/features.go
- KV3 = kubeadm v1beta3 doc.go, release-1.33: https://github.com/kubernetes/kubernetes/blob/release-1.33/cmd/kubeadm/app/apis/kubeadm/v1beta3/doc.go
- VSP = Version Skew Policy (release-1.33 source): https://github.com/kubernetes/website/blob/release-1.33/content/en/releases/version-skew-policy.md

## Which API versions stopped being served in v1.33, and which were newly deprecated (with planned removal version)?

### Takeaway
No GA or beta API group/version stopped being served in v1.33. The only API version removed was the alpha `admissionregistration.k8s.io/v1alpha1` ValidatingAdmissionPolicy/ValidatingAdmissionPolicyBinding (plus dead code for `authentication.k8s.io/v1alpha1`). New deprecations: `resource.k8s.io/v1beta1` (DRA), to be removed in 1.36; core v1 Endpoints (deprecated, never to be removed); Pod `status.resize`; the `service.kubernetes.io/topology-mode` annotation. Several field, feature-gate and flag removals also affect the API, chiefly Node `status.nodeInfo.kubeProxyVersion`, the gitRepo volume driver, Windows hostNetwork, and the kube-apiserver `--cloud-provider`/`--cloud-config` flags.

### Cited Findings
**API versions removed or no longer served**
- "Removed support for `v1alpha1` version of `ValidatingAdmissionPolicy` and `ValidatingAdmissionPolicyBinding` API kinds." (PR #129207). The GA replacement is `admissionregistration.k8s.io/v1`. — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)
- "kube-apiserver: Inactive serving code is removed for `authentication.k8s.io/v1alpha1` APIs" (PR #129186). — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)
- "`apidiscovery.k8s.io/v2beta1` API group is disabled by default" (PR #130347). — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)

**New API deprecations**
- "The `resource.k8s.io/v1beta1` API is deprecated and will be removed in 1.36. Use `v1beta2` instead." (PR #129970). This covers DRA kinds such as ResourceClaim, ResourceClaimTemplate, DeviceClass and ResourceSlice. — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)
- "The v1 Endpoints API is now officially deprecated (though still fully supported). The API will not be removed, but all users should use the EndpointSlice API instead." (PR #130098, KEP-4974) — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md); [REL](https://kubernetes.io/blog/2025/04/23/kubernetes-v1-33-release/)
- The Pod `status.resize` field "is now deprecated and will no longer be set". Resize status now appears in the Pod conditions `PodResizeInProgress` and `PodResizePending` (PR #130733). — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)
- The EndpointSlice `hints` field went GA. The beta annotation `service.kubernetes.io/topology-mode` "is now considered deprecated and will not graduate to GA", but still works. Use Service `spec.trafficDistribution` instead, which went GA in 1.33 (PRs #130742, #130673). — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)
- With the `PreferSameTrafficDistribution` gate, the new trafficDistribution value `PreferSameZone` is introduced "as an alias for `PreferClose`" (PR #130844). — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)

**Removed fields and behaviour with API impact**
- Node `.status.nodeInfo.kubeProxyVersion`: "Following its deprecation in v1.31 ... the .status.nodeInfo.kubeProxyVersion field for Nodes was removed in v1.33" (KEP-4004). — [REL](https://kubernetes.io/blog/2025/04/23/kubernetes-v1-33-release/); [PEEK](https://kubernetes.io/blog/2025/03/26/kubernetes-v1-33-upcoming-changes/). The changelog words this as the `DisableNodeKubeProxyVersion` feature gate being enabled by default, so "the kubelet no longer attempts to set the `.status.kubeProxyVersion` field" (PR #129713). — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)
- gitRepo volume: "git-repo volume plugin has been disabled by default, with the option to turn it back" (PR #129923). — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)
  - The blog adds that the field stays in the API, so the apiserver still admits Pods with gitRepo volumes. Kubelets with `GitRepoVolumeDriver=false` refuse to run them. Users can re-enable the driver for 3 versions, and the gate and in-tree code are planned for removal in v1.39 (KEP-5040). The deprecation dates from v1.11. — [REL](https://kubernetes.io/blog/2025/04/23/kubernetes-v1-33-release/)
- "Removed alpha support for Windows HostNetwork containers" (PR #130250, KEP-3503 withdrawn). HostProcess containers are not affected. — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md); [REL](https://kubernetes.io/blog/2025/04/23/kubernetes-v1-33-release/)
- New StatefulSets with a `.spec.serviceName` must now pass DNS1123 validation (PR #130233). — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)
- Validation was added for `NodeSelectorRequirement` values when Pods are created (PR #128212). — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)
- InPlacePodVerticalScaling: container `resizePolicy` is no longer mutable, and memory limits cannot be decreased unless the policy is `RestartContainer` (PR #130183). — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)
- DRA behaviour changes: up to 256 pods can now share a ResourceClaim, up from 32, and downgrading to 1.32.0 while this is in use is unsupported (PR #129543). Only an admin namespace labelled `kubernetes.io/dra-admin-access` can hold `adminAccess` claims (PR #130225). "All"-device requests now need at least one device on the node (PR #129560). — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)
- `kubectl apply` now turns `null` label and annotation values into empty strings instead of dropping all labels and annotations (PR #129257). — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)

**Removed or deprecated feature gates (all from CL)**
- Removed after GA: `CPUManager` (#129296), `PDBUnhealthyPodEvictionPolicy` (#129500), `PersistentVolumeLastPhaseTransitionTime` (#129295), `AppArmor` (#129375), `AppArmorFields` (#129497), `KubeProxyDrainingTerminatingNodes` (#129692), `JobPodFailurePolicy` (#129498), `DisableCloudProviders` and `DisableKubeletCloudCredentialProviders` (#130162). — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)
- Deprecated: `WatchFromStorageWithoutResourceVersion` ("can no longer be enabled", #129930). `InPlacePodVerticalScalingAllocatedStatus` ("deprecated and no longer used", #130880). `SeparateCacheWatchRPC` (deprecated, disabled by default, #129929). `StorageNamespaceIndex` (set to false and deprecated, #129933). The alpha `VolumeCapacityPriority` was replaced by `StorageCapacityScoring`, which scores the opposite way (#128184). — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)
- `SidecarContainers` went GA. The gate is locked on and will be removed in v1.36, and the changelog says "If you were setting this feature gate explicitly, please remove it now" (#129731). A temporary `LegacySidecarContainers` gate exists only in v1.33 and will be removed in v1.34 (#130058). — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)

**Removed flags and metrics**
- "kube-apiserver: removed the deprecated the `--cloud-provider` and `--cloud-config` CLI parameters" (#130162). — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)
- The deprecated `pod_scheduling_duration_seconds` metric was removed. `scheduler_scheduler_cache_size` is deprecated in favour of `scheduler_cache_size` and will be removed in v1.34 (#128810). — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)

**Urgent upgrade notes (all items, from CL)**
- The `ReduceDefaultCrashLoopBackOffDecay` gate cuts the CrashLoopBackOff delays to 1s initial and 60s maximum. A conflict policy applies when it is combined with `KubeletCrashLoopBackOffMax` (#130711).
- [Action Required] CSI drivers that call `IsLikelyNotMountPoint` must not assume that `false` means the path is a mount point (#129370).
- The `KUBE_PROXY_NFTABLES_SKIP_KERNEL_VERSION_CHECK` env var now skips the check only when it is set to a non-empty value (#130401).
- The scheduler framework action type `UpdatePodTolerations` was renamed to `UpdatePodToleration`, so custom plugin developers must update their code (#129023).
- Source for all four items: [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)
- The `MultiCIDRServiceAllocator` graduation (ServiceCIDR API GA) is flagged "**Action required** for Kubernetes cluster administrators and for distributions that manage the cluster Service CIDR". The changelog suggests ValidatingAdmissionPolicy to keep new ServiceCIDRs from overlapping other networks (#128971). — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)

### Inferences
- A typical 1.32 cluster needs no manifest rewrites for removed GA or beta APIs on this step. The main risks are behavioural: gitRepo volumes, tooling that reads Node `kubeProxyVersion`, alpha VAP v1alpha1 objects, explicit settings of removed feature gates (which make components fail to start), and kube-apiserver manifests that still pass `--cloud-provider`/`--cloud-config`.
- Anyone using DRA `resource.k8s.io/v1beta1` should plan to migrate to `v1beta2` before 1.36.

### Gaps
- The CL lists only the v1alpha1 VAP/VAPB kinds. I did not verify whether `ValidatingAdmissionPolicy` was the only kind in `admissionregistration.k8s.io/v1alpha1` at the time. MutatingAdmissionPolicy v1alpha1 was still present as alpha in 1.33, but that is from memory and not verified here.
- PEEK described the kubeProxyVersion field as "disabled by default since v1.31". CL 1.33 describes `DisableNodeKubeProxyVersion` as being enabled by default in 1.33. The two read slightly differently (default-off since 1.31, versus enforced in 1.33). I did not check the 1.31/1.32 changelogs to settle this.

## What does the Deprecated API Migration Guide list for v1.33?

### Takeaway
Nothing. The guide's "Removed APIs by release" section jumps from v1.32 (flowcontrol v1beta3) straight back to v1.29, both in the release-1.33 docs branch and on the current main branch. That confirms no beta or GA API version was removed in v1.33.

### Cited Findings
- The guide's sections are v1.32, v1.29, v1.27, v1.26, v1.25, v1.22 and v1.16. There is no v1.33 entry. — [DG](https://kubernetes.io/docs/reference/using-api/deprecation-guide/) ([release-1.33 source](https://github.com/kubernetes/website/blob/release-1.33/content/en/docs/reference/using-api/deprecation-guide.md))
- The most recent prior entry is v1.32, which stopped serving `flowcontrol.apiserver.k8s.io/v1beta3` FlowSchema and PriorityLevelConfiguration. The replacement is `flowcontrol.apiserver.k8s.io/v1`, available since v1.29. — [DG](https://kubernetes.io/docs/reference/using-api/deprecation-guide/)
- Deprecation policy recap: GA APIs may be deprecated but not removed within a major version. Beta APIs must be supported for 3 releases after deprecation. Alpha APIs may be removed in any release without notice. — [PEEK](https://kubernetes.io/blog/2025/03/26/kubernetes-v1-33-upcoming-changes/)

### Inferences
- A cluster coming from 1.32 should already have migrated off flowcontrol v1beta3 at the 1.31 -> 1.32 step. Nothing in the guide adds work for 1.33.
- The guide also has no future entry for `resource.k8s.io/v1beta1`, which is slated for removal in 1.36 per CL.

### Gaps
- None.

## What does the official kubeadm "Upgrading kubeadm clusters" page for v1.33 prescribe (package repos, order, drain, version skew)?

### Takeaway
Upgrade one minor version at a time (skipping minors is unsupported). First switch the pkgs.k8s.io repository to v1.33. Then upgrade kubeadm and run `kubeadm upgrade plan` and `kubeadm upgrade apply v1.33.x` on the first control-plane node, and `kubeadm upgrade node` on the other control-plane nodes, one at a time. On each node, drain, upgrade kubelet and kubectl, restart kubelet and uncordon. Upgrade worker nodes last, one or a few at a time.

### Cited Findings
- Scope: the page covers 1.32.x -> 1.33.x and 1.33.x -> 1.33.y. "Skipping MINOR versions when upgrading is unsupported." — [UP](https://v1-33.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)
- High-level order: (1) primary control-plane node, (2) additional control-plane nodes, (3) worker nodes. — [UP](https://v1-33.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)
- Prerequisites: read the release notes. The cluster must use static control-plane and etcd pods, or external etcd. Back up important components, since `kubeadm upgrade` only touches Kubernetes internals. "Swap must be disabled." — [UP](https://v1-33.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)
- Drain: for a minor kubelet upgrade you "**must** first drain the node" (`kubectl drain <node> --ignore-daemonsets`), and afterwards `kubectl uncordon <node>`. Control-plane nodes may run CoreDNS or other critical workloads. — [UP](https://v1-33.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)
- The page recommends matching kubelet and kubeadm versions. An older kubelet is allowed within the supported skew. All containers restart after the upgrade because the container spec hash changes. — [UP](https://v1-33.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)
- `kubeadm upgrade` accepts `--config` with an `UpgradeConfiguration` (kubeadm config API v1beta4). It does not support reconfiguring a cluster; use the "Reconfiguring a kubeadm cluster" procedure for that. — [UP](https://v1-33.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)
- etcd consideration: in-flight requests stall while etcd restarts. The suggested workaround is `killall -s SIGTERM kube-apiserver`, `sleep 20`, then the `kubeadm upgrade ...` command. — [UP](https://v1-33.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)
- Package repository: users of `pkgs.k8s.io` must enable the repository for the target minor version, following "Changing the Kubernetes package repository". The repo lines take the form `https://pkgs.k8s.io/core:/stable:/v1.33/deb/` (or `/rpm/`), and the legacy repositories are deprecated. — [UP](https://v1-33.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/); [change-package-repository source](https://github.com/kubernetes/website/blob/release-1.33/content/en/docs/tasks/administer-cluster/kubeadm/change-package-repository.md)
- Find the version with `apt-cache madison kubeadm` or `yum list --showduplicates kubeadm --disableexcludes=kubernetes`. Install kubeadm with `apt-mark unhold`, `apt-get install kubeadm='1.33.x-*'`, `apt-mark hold`, or with `yum install kubeadm-'1.33.x-*' --disableexcludes=kubernetes`. — [UP](https://v1-33.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)
- First control-plane node (it must have `/etc/kubernetes/admin.conf`): run `kubeadm version`, then `sudo kubeadm upgrade plan`, then `sudo kubeadm upgrade apply v1.33.x`, then upgrade the CNI plugin manually. Certificates are renewed automatically unless `--certificate-renewal=false` is passed. — [UP](https://v1-33.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)
- Other control-plane nodes: run `sudo kubeadm upgrade node`. `upgrade plan` and the CNI upgrade are not needed there. Control-plane nodes must be upgraded sequentially. Since v1.28, kubeadm waits until all control-plane instances are upgraded before it upgrades the CoreDNS and kube-proxy addons. — [UP](https://v1-33.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)
- Kubelet and kubectl: install `1.33.x-*`, then run `systemctl daemon-reload` and `systemctl restart kubelet`. Worker nodes are done "one node at a time or few nodes at a time", following the Linux and Windows node pages. Finish by verifying with `kubectl get nodes`. — [UP](https://v1-33.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)
- Recovery: `kubeadm upgrade` is idempotent, and `kubeadm upgrade apply --force` can recover a bad state. Backups are written to `/etc/kubernetes/tmp/kubeadm-backup-etcd-*` and `kubeadm-backup-manifests-*` and must be cleaned up by hand. — [UP](https://v1-33.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)
- What `upgrade apply` checks: the API server is reachable, all nodes are Ready, the control plane is healthy, the version-skew policy is enforced, and images are pullable. It then upgrades the components with rollback, applies the CoreDNS and kube-proxy manifests and RBAC, and renews API server certs that expire within 180 days. — [UP](https://v1-33.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)
- Version skew: in HA clusters, kube-apiserver instances must be within one minor version of each other. The kubelet must not be newer than kube-apiserver and may be up to three minors older. kube-proxy follows the same rule and may be up to three minors away from its kubelet. — [VSP](https://github.com/kubernetes/website/blob/release-1.33/content/en/releases/version-skew-policy.md)
- kubeadm 1.33 code enforces `MinimumControlPlaneVersion = getSkewedKubernetesVersion(-1)` (1.32) and `MinimumKubeletVersion = getSkewedKubernetesVersion(-3)` (1.30). — [KC](https://github.com/kubernetes/kubernetes/blob/release-1.33/cmd/kubeadm/app/constants/constants.go)

### Inferences
- kubeadm v1.33 can only upgrade control planes that are already at 1.32. Kubelets at 1.30 or newer are tolerated during the transition.

### Gaps
- I did not fetch the separate "Upgrading Linux nodes" and "Upgrading Windows nodes" pages for 1.33 in full. They are referenced from UP, and they typically prescribe `kubeadm upgrade node`, drain, kubelet upgrade, then uncordon.

## What kubeadm-specific urgent upgrade notes and action-required items are in CHANGELOG-1.33?

### Takeaway
CHANGELOG-1.33 has no kubeadm-specific "Urgent Upgrade Notes". kubeadm changes in v1.33.0 are: two feature gates promoted to beta and on by default (`WaitForAllControlPlaneComponents`, `ControlPlaneKubeletLocalMode`); the GA `EtcdLearnerMode` gate removed; a new alpha `NodeLocalCRISocket`; several preflight checks added or removed; a new `--etcd-upgrade` plan flag; etcd 3.5.21-0 at v1.33.0 (3.5.24-0 in later patches); and CoreDNS v1.12.0. The v1beta3 config API is still accepted but deprecated, with removal "1.34 or later".

### Cited Findings
**Feature gates**
- "kubeadm: Promoted the feature gate `ControlPlaneKubeletLocalMode` to Beta." By default kubeadm now points the kubelet at the local kube-apiserver endpoint on `kubeadm init` and control-plane `kubeadm join`. In `kubeadm init phase kubeconfig kubelet`, `--control-plane-endpoint` no longer affects the generated kubeconfig `Server`; use `--apiserver-advertise-address` instead (#129956). — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)
- "kubeadm: graduated the WaitForAllControlPlaneComponents feature gate to Beta." Health checks use the address and port from each component's static Pod manifest (#129620). — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)
- In code, both gates are `Default: true, PreRelease: Beta`. `NodeLocalCRISocket` is `Default: false, Alpha`. `PublicKeysECDSA` is Deprecated and "will be removed when v1beta3 is removed". `RootlessControlPlane` is alpha and deprecated in favour of the kubelet `UserNamespacesSupport`. — [KF](https://github.com/kubernetes/kubernetes/blob/release-1.33/cmd/kubeadm/app/features/features.go)
- "kubeadm: removed the feature gate EtcdLearnerMode which graduated to GA in 1.32" (#129589). — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)
- With `NodeLocalCRISocket` enabled, `kubeadm upgrade` removes the `kubeadm.alpha.kubernetes.io/cri-socket` Node annotation (#129279) and removes `--container-runtime-endpoint` from `/var/lib/kubelet/kubeadm-flags.env` (#129278). — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)
- A fix makes it possible to health-check kube-apiserver with `--anonymous-auth=false` when `WaitForAllControlPlaneComponents` is enabled (#131036). — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)

**Preflight checks**
- Added: `cp` on Linux and `xcopy` on Windows (#130045), and `losetup` on Linux, which the kubelet needs (#129450). — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)
- Removed: `nsenter` (#129450), `ip`, `iptables`, `ethtool`, `tc` (#129131) and `touch` (#129317). — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)
- "kubeadm: run kernel version and OS version preflight checks for `kubeadm upgrade`" (#129401). — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)

**Upgrade command and config API changes**
- `kubeadm upgrade plan` gained an `--etcd-upgrade` flag, and an `EtcdUpgrade` field was added to `UpgradeConfiguration.Plan` in v1beta4 (#130023). — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)
- Fixes: `node.skipPhases` in UpgradeConfiguration is now respected by `kubeadm upgrade node` (#129452). A panic when no UpgradeConfiguration was in the config file is fixed (#130202). The v1beta4 `Timeouts.EtcdAPICall` is now respected (#129859). Addons disabled in ClusterConfiguration are skipped during upgrade (#129418). — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)
- kubeadm config API: "DEPRECATED: v1beta3 is deprecated in favor of v1beta4 and will be removed in a future release, 1.34 or later." — [KV3](https://github.com/kubernetes/kubernetes/blob/release-1.33/cmd/kubeadm/app/apis/kubeadm/v1beta3/doc.go)
- Patch v1.33.5: a fix makes v1beta3's `ClusterConfiguration.APIServer.TimeoutForControlPlane` respected again when v1beta4 is the default (#133754). — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)

**Component versions deployed by kubeadm**
- etcd: kubeadm v1.33.0 `DefaultEtcdVersion = "3.5.21-0"`, with `SupportedEtcdVersion` 3.5.21-0 for minors 30 to 33. — [KC v1.33.0](https://github.com/kubernetes/kubernetes/blob/v1.33.0/cmd/kubeadm/app/constants/constants.go)
- The current release-1.33 branch has `DefaultEtcdVersion = "3.5.24-0"`. — [KC](https://github.com/kubernetes/kubernetes/blob/release-1.33/cmd/kubeadm/app/constants/constants.go)
- Patch v1.33.6 changelog: "Kubeadm: updated the supported etcd version to v3.5.24 for the skewed control plane version v1.33" (#135018). — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)
- The etcd client library was updated to v3.5.21 (from v3.5.16) in v1.33.0 (#131103). — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)
- "Kubernetes tools now install CoreDNS `v1.12.0`" (#128926). kubeadm `CoreDNSVersion = "v1.12.0"`. Some CoreDNS metrics were renamed (#129232). — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md); [KC](https://github.com/kubernetes/kubernetes/blob/release-1.33/cmd/kubeadm/app/constants/constants.go)
- Pause image: `PauseVersion = "3.10"`. cri-tools was updated to v1.32.0 (#129116). — [KC](https://github.com/kubernetes/kubernetes/blob/release-1.33/cmd/kubeadm/app/constants/constants.go); [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)

**Notable kubeadm fixes in later 1.33 patches (from CL patch sections)**
- v1.33.3: a fix for etcd member promotion failing with "already promoted" (#132280).
- v1.33.6: waiting for the apiserver now uses the local endpoint (#134269). The node name is fixed in `kubeadm upgrade node` when it differs from the hostname (#134363).
- v1.33.8: extraArgs overrides are no longer sorted (#135851). kubeadm waits for the etcd learner to start before promotion (#136365).
- v1.33.10: learner members are no longer added to etcd client endpoints (#137259).
- v1.33.12: the etcd cluster health check uses quorum (#138541). A dedicated ClusterRole `system:kubelet-api-admin` is used for the apiserver kubelet client (#138964).
- Source for all patch items: [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)

**Cross-cutting items that affect kubeadm-generated manifests**
- kube-apiserver `--cloud-provider` and `--cloud-config` were removed (#130162). Any kubeadm `ClusterConfiguration.apiServer.extraArgs` that sets them will make kube-apiserver fail to start. — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)
- Explicitly set feature gates that were removed in 1.33 (listed in the first section) must be dropped from component extraArgs and KubeletConfiguration. — [CL](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)

### Inferences
- The two failures most likely to break an upgrade for kubeadm users are leftover `--cloud-provider`/`--cloud-config` apiserver extraArgs, and removed feature gates left in `featureGates` or `extraArgs`. The first is an inference from the flag removal plus how kubeadm passes extraArgs.
- The new preflight checks (`losetup`, `cp`) and the kernel/OS checks now run during `kubeadm upgrade`, so minimal or immutable node images should be checked for `losetup` before upgrading.
- Because `ControlPlaneKubeletLocalMode` is now on by default, newly joined control-plane kubelets point at the local apiserver. The changelog wording ("when creating a cluster with `kubeadm init` or when joining control plane nodes") suggests existing nodes are not rewritten on upgrade, but this is not stated explicitly.
- Using the latest 1.33 patch gives etcd 3.5.24-0 and the many etcd-learner and upgrade fixes, which matches UP's advice to pick the latest patch.

### Gaps
- There is no dedicated "kubeadm" subsection in the Urgent Upgrade Notes; the kubeadm items are spread across Feature, Bug and Other.
- I did not verify whether `kubeadm upgrade apply` to v1.33 rewrites the existing control-plane kubelet kubeconfig under `ControlPlaneKubeletLocalMode`.
- I did not fetch the kubeadm-config.v1beta4 reference page itself for 1.33; the field change (`UpgradeConfiguration.Plan.EtcdUpgrade`) comes from CL.
