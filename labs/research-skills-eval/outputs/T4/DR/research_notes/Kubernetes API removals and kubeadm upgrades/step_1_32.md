# Kubernetes 1.31 -> 1.32 upgrade step: API removals/deprecations and kubeadm upgrade requirements

Source note: the primary sources were read from the repositories that publish the official docs and changelog (release-1.32 branch of kubernetes/kubernetes and kubernetes/website), plus the kubernetes.io blog. The v1.32.0 section of the changelog is anchored at `#v1320`, and its "Changelog since v1.31.0" part is the cumulative 1.31 -> 1.32 delta. Fetch anomaly: the raw `master` URL for CHANGELOG-1.32.md returned v1.33.x content when fetched on 2026-11-24 (possibly a proxy or cache problem). The release-1.32 branch copy was used instead: https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md

Short URLs used below:
- CL132 = https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320
- DEPGUIDE = https://kubernetes.io/docs/reference/using-api/deprecation-guide/#flowcontrol-resources-v132
- UPG = https://v1-32.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/

## Q1: Which API versions stopped being served in v1.32, and which were newly deprecated (with planned removal version)?

### Takeaway
Only one GA-track API version stopped being served in v1.32: `flowcontrol.apiserver.k8s.io/v1beta3` (FlowSchema and PriorityLevelConfiguration). The release also dropped the alpha `coordination.k8s.io/v1alpha1` (replaced by v1alpha2) and removed classic DRA (the PodSchedulingContext / `DRAControlPlaneController` path). Several GA feature gates and some flags were removed. The new deprecations in v1.32 are small: the ServiceAccount `kubernetes.io/enforce-mountable-secrets` annotation has no removal deadline, and the alpha DRA gRPC API "might be removed in future releases".

### Cited Findings
**APIs that stopped being served or were removed**
- `flowcontrol.apiserver.k8s.io/v1beta3` FlowSchema and PriorityLevelConfiguration are no longer served in v1.32. Migrate to `flowcontrol.apiserver.k8s.io/v1`, which has been available since v1.29 (PR #127017). — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)
- The blog says "There is one API removal in Kubernetes v1.32": flowcontrol v1beta3. All persisted objects stay accessible through the v1 API. — [Kubernetes v1.32 release blog](https://kubernetes.io/blog/2024/12/11/kubernetes-v1-32-release/); also the [v1.32 sneak peek blog](https://kubernetes.io/blog/2024/11/08/kubernetes-1-32-upcoming-changes/)
- Alpha: "Coordination.v1alpha1 API is dropped and replaced with coordination.v1alpha2. Old coordination.v1alpha1 types must be deleted before upgrade" (PR #127857). This relates to LeaseCandidate and coordinated leader election. — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)
- Alpha, classic DRA withdrawn: "Removed all support for classic dynamic resource allocation (DRA). The `DRAControlPlaneController` feature gate, formerly alpha, is no longer available." If classic DRA was enabled, remove the dependent workloads and make sure all PodSchedulingContext resources are gone **before upgrading**. They cannot be removed through the apiserver after the upgrade (PR #128003). — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320); background in the [v1.32 release blog](https://kubernetes.io/blog/2024/12/11/kubernetes-v1-32-release/) (KEP #3063 withdrawn, KEP #4381 structured parameters remains)
- DRA moved to beta (`resource.k8s.io/v1beta1`). The previous v1alpha3 API is still supported on upgrade. Downgrading 1.32 -> 1.31 with DRA objects in the cluster is not supported, because v1beta1 is the storage version (PR #127511). — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)
- Field rename in `resource/v1alpha3.ResourceSliceList`: `listMeta` is now `metadata` (PR #126749). — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)
- Removed fixture: the Aggregated Discovery v2beta1 fixture is removed from `./api/discovery`; use v2 (PR #127008). — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)

**New APIs or versions introduced (for context)**
- `admissionregistration.k8s.io/v1alpha1` MutatingAdmissionPolicy (needs the `MutatingAdmissionPolicy` gate plus `--runtime-config`) (PR #127134). — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)
- `--authorization-config` now accepts `apiserver.config.k8s.io/v1` AuthorizationConfiguration, with no changes from v1beta1. `StructuredAuthorizationConfiguration` is GA (PR #128172). — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)
- A new Pod `/resize` subresource is used for in-place resize requests (PR #128266). — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)

**New deprecations in v1.32**
- ServiceAccount `metadata.annotations[kubernetes.io/enforce-mountable-secrets]` is "deprecated since v1.32; no removal deadline". Use separate namespaces to isolate access to mounted secrets instead (PR #128396). — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)
- The `DisableNodeKubeProxyVersion` feature gate went back to default-off. This keeps a full year between the deprecation announcement in 1.29 and clearing the field by default (PR #126720). — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)
- The alpha DRA kubelet gRPC API is still available but "might be removed in future releases". Drivers should move to the v1beta1 gRPC API (PR #128646). — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)
- `runOnce` in the kubelet config file: setting it is an error, and specifying any value is now deprecated. The `--runonce` flag is removed and using it is an error (PR #126336). — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)
- Feature `AllowServiceLBStatusOnNonLB` stays deprecated and is now locked to false (PR #128139). A separate entry says the gate "has been removed" (PR #126786). The two entries are inconsistent in the changelog itself. — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)
- kubectl debug: a warning now says the `legacy` profile is planned to be deprecated (PR #127230). — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)
- Promoted to GA, so the `=true` flag will be removed in the future: `CustomResourceFieldSelectors` (PR #127673) and `RetryGenerateName` (PR #127093). — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)

**Feature gates removed in v1.32** (passing a removed gate makes a component fail to start)
- GA gates removed: `HPAContainerMetrics`, `ValidatingAdmissionPolicy`, `CloudDualStackNodeIPs`, `LegacyServiceAccountTokenCleanUp`, `MinDomainsInPodTopologySpread`, `NewVolumeManagerReconstruction`, `NodeOutOfServiceVolumeDetach`, `StableLoadBalancerNodeSet`, `ZeroLimitedNominalConcurrencyShares`, `ServerSideApply`, `ServerSideFieldValidation`, `KMSv2`, `KMSv2KDF`, `ComponentSLIs`, `PodHostIPs`, `AllowServiceLBStatusOnNonLB`. — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)
- Alpha gate removed: `DRAControlPlaneController`. — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)

**Flags, config and plugins removed, with API or config impact**
- kube-controller-manager: legacy cloud provider code and the `service-lb-controller`, `cloud-node-lifecycle-controller` and `node-route-controller` were removed. `--cloud-provider` must be `external` or empty; all other values are invalid (PR #128197). — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)
- kube-scheduler: the `AzureDiskLimits`, `CinderLimits`, `EBSLimits` and `GCEPDLimits` plugins were removed. Remove them from the scheduler config if you enabled them explicitly (PR #124003). — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)
- Pod resize: requests and limits can no longer be removed during a resize (PR #128683). — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)
- kubelet `--image-credential-provider-config` now uses strict deserialization. Duplicate or unknown fields make it fail (PR #128062). — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)
- Default `node-monitor-grace-period` raised from 40s to 50s (PR #126287). — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)
- The `ServiceAccountNodeAudienceRestriction` kube-apiserver gate is on by default. NodeRestriction now checks that the audiences kubelet requests are in the pod's volumes (PR #128077). — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)
- Action required for custom scheduler plugin developers: `PodEligibleToPreemptOthers` now takes `ctx` (PR #126465). `NodeToStatusMap` changed from a map to a struct (PR #126022). — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)

**Urgent Upgrade Notes**
- The v1.32.0 changelog section says: "There are no urgent upgrade notes for the v1.32 release." — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)
- One pre-release section (an alpha changelog within CHANGELOG-1.32) carried an urgent note. If `InPlacePodVerticalScaling` is in use, clean up `/var/lib/kubelet/pod_status_manager_state` when upgrading the kubelet, because the checkpoint format changed and kubelet may fail to start (PR #126620). — [CHANGELOG-1.32 (pre-release sections)](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md)

### Inferences
- For most clusters the only blocking API migration is flowcontrol v1beta3 -> v1, together with checking the removed feature gates in component flags or kubeadm `extraArgs`. Classic DRA and coordination v1alpha1 matter only if those alpha features were enabled.
- Leftover `--feature-gates=<removed GA gate>=true` flags in static Pod manifests or kubeadm ClusterConfiguration `extraArgs` should be removed before or during the upgrade. A component given an unknown gate refuses to start (general Kubernetes behaviour, not stated explicitly in the 1.32 notes).

### Gaps
- No complete official list of kubelet or kube-proxy flags newly marked deprecated in 1.32 was found beyond the items above.
- The "Feature gates (removed)" reference page was not cross-checked for every gate. The list above comes only from the changelog.

## Q2: What does the Deprecated API Migration Guide list for v1.32?

### Takeaway
The guide lists exactly one entry for v1.32: flowcontrol v1beta3 -> v1. It also notes one behavioural change in v1.

### Cited Findings
- "The v1.32 release stopped serving the following deprecated API versions: Flow control resources. The flowcontrol.apiserver.k8s.io/v1beta3 API version of FlowSchema and PriorityLevelConfiguration is no longer served as of v1.32." — [DEPGUIDE](https://kubernetes.io/docs/reference/using-api/deprecation-guide/#flowcontrol-resources-v132)
- Migration: use `flowcontrol.apiserver.k8s.io/v1`, available since v1.29. All existing persisted objects are accessible through the new API. — [DEPGUIDE](https://kubernetes.io/docs/reference/using-api/deprecation-guide/#flowcontrol-resources-v132)
- Notable change in v1: PriorityLevelConfiguration `spec.limited.nominalConcurrencyShares` defaults to 30 only when unspecified. An explicit value of 0 is not changed to 30. — [DEPGUIDE](https://kubernetes.io/docs/reference/using-api/deprecation-guide/#flowcontrol-resources-v132)
- The guide lists no entries between v1.29 and v1.32. The next section down is v1.29. — [DEPGUIDE](https://kubernetes.io/docs/reference/using-api/deprecation-guide/)

### Inferences
- Alpha removals such as coordination v1alpha1 and classic DRA are not in the migration guide. The guide covers deprecated beta and GA versions, so the changelog is the only official source for them.

### Gaps
- None for this question.

## Q3: What does the official kubeadm "Upgrading kubeadm clusters" page for v1.32 prescribe?

### Takeaway
Upgrade one minor version at a time: 1.31.x -> 1.32.x. First switch the pkgs.k8s.io repository to v1.32. Then upgrade kubeadm on the first control plane node and run `kubeadm upgrade plan` and `kubeadm upgrade apply v1.32.x`. Next run `kubeadm upgrade node` on the other control plane nodes, one at a time. On each node: drain, upgrade kubelet and kubectl, restart the kubelet, then uncordon. Worker nodes come last, one or a few at a time.

### Cited Findings
**Scope and skew**
- The page covers 1.31.x -> 1.32.x and 1.32.x -> 1.32.y. "Skipping MINOR versions when upgrading is unsupported." — [UPG](https://v1-32.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)
- High-level order: (1) primary control plane node, (2) additional control plane nodes, (3) worker nodes. — [UPG](https://v1-32.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)
- kubeadm runs with control plane components of the same version or one minor older. It runs with a kubelet of the same version or up to three minor versions older. — [kubeadm skew policy (v1.32 docs)](https://v1-32.docs.kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/#version-skew-policy)
- Nodes being upgraded must use a kubeadm of the same minor version, or one minor newer, than the kubeadm that manages the node. Example: a node created or upgraded with kubeadm 1.31 can be upgraded with kubeadm 1.31 or 1.32. — [kubeadm skew policy (v1.32 docs)](https://v1-32.docs.kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/#version-skew-policy)
- In kubeadm v1.32.0, `MinimumControlPlaneVersion` is current-1 and `MinimumKubeletVersion` is current-3. — [kubeadm constants.go @ v1.32.0](https://github.com/kubernetes/kubernetes/blob/v1.32.0/cmd/kubeadm/app/constants/constants.go)

**Prerequisites**
- Read the release notes carefully. — [UPG](https://v1-32.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)
- The cluster must use static control plane and etcd pods, or external etcd. — [UPG](https://v1-32.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)
- Back up important components. `kubeadm upgrade` does not touch workloads. — [UPG](https://v1-32.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)
- Swap must be disabled. — [UPG](https://v1-32.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)
- For a minor kubelet upgrade you **must** drain the node first. Control plane nodes may run CoreDNS or other critical workloads. — [UPG](https://v1-32.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)
- Match kubelet and kubeadm versions. An older kubelet within the supported skew is allowed. — [UPG](https://v1-32.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)
- All containers restart after the upgrade because the container spec hash changes. — [UPG](https://v1-32.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)
- `kubeadm upgrade` accepts `--config` with an `UpgradeConfiguration` (kubeadm v1beta4 API). It does not support reconfiguring an existing cluster; use the "Reconfiguring a kubeadm cluster" page for that. — [UPG](https://v1-32.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)
- etcd consideration: in-flight requests stall while the etcd static pod restarts. Optional workaround: `killall -s SIGTERM kube-apiserver`, then `sleep 20`, then run `kubeadm upgrade ...`. — [UPG](https://v1-32.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)

**Package repositories**
- With the community-owned `pkgs.k8s.io` repositories, you must enable the repository for the target minor release, following "Changing the Kubernetes package repository". — [UPG](https://v1-32.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)
- Repositories are per minor version, for example `https://pkgs.k8s.io/core:/stable:/v1.32/deb/` and `.../v1.32/rpm/` (with `repodata/repomd.xml.key`). You edit the existing repo definition from v1.31 to v1.32. — [Changing the Kubernetes package repository (v1.32 docs)](https://v1-32.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/change-package-repository/)
- Find the latest patch with `apt-cache madison kubeadm` (Debian/Ubuntu) or `yum list --showduplicates kubeadm --disableexcludes=kubernetes` (RHEL/Fedora). — [UPG](https://v1-32.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)

**Steps on the first control plane node**
- This node must have `/etc/kubernetes/admin.conf`. Upgrade control plane nodes one at a time. — [UPG](https://v1-32.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)
- Upgrade kubeadm: `apt-mark unhold kubeadm && apt-get install -y kubeadm='1.32.x-*' && apt-mark hold kubeadm`, or `yum install -y kubeadm-'1.32.x-*' --disableexcludes=kubernetes`. Then check with `kubeadm version`. — [UPG](https://v1-32.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)
- Run `sudo kubeadm upgrade plan`. It checks that the cluster can be upgraded and shows component config version states. kubeadm upgrade auto-renews the certificates it manages; opt out with `--certificate-renewal=false`. — [UPG](https://v1-32.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)
- Run `sudo kubeadm upgrade apply v1.32.x`. On success it prints `[upgrade/successful] SUCCESS! ...`. — [UPG](https://v1-32.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)
- Addons: since v1.28, kubeadm upgrades CoreDNS and kube-proxy only after all control plane instances have been upgraded. Upgrade control plane instances sequentially. — [UPG](https://v1-32.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)
- Upgrade the CNI plugin manually, following the provider's instructions. — [UPG](https://v1-32.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)

**Other control plane nodes**
- Same steps, but run `sudo kubeadm upgrade node` instead of `apply`. `upgrade plan` and the CNI upgrade are not needed. — [UPG](https://v1-32.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)

**Per-node kubelet steps**
- `kubectl drain <node> --ignore-daemonsets`. Then upgrade kubelet and kubectl (`1.32.x-*`, using unhold/hold). Then `systemctl daemon-reload && systemctl restart kubelet`. Then `kubectl uncordon <node>`. — [UPG](https://v1-32.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)
- Workers: upgrade one or a few at a time without losing minimum capacity. Linux and Windows worker procedures are on separate pages. Finally check `kubectl get nodes` shows Ready and the new version. — [UPG](https://v1-32.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)

**Recovery and internals**
- `kubeadm upgrade` is idempotent and can be re-run. `kubeadm upgrade apply --force` recovers from a bad state without changing the version. Backups are written to `/etc/kubernetes/tmp/kubeadm-backup-etcd-<date>-<time>` and `kubeadm-backup-manifests-<date>-<time>` and must be cleaned up manually. — [UPG](https://v1-32.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)
- `upgrade apply` checks that the API server is reachable, all nodes are Ready and the control plane is healthy. It also enforces skew, pre-pulls images, upgrades component configs, upgrades or rolls back the control plane, applies the CoreDNS and kube-proxy manifests plus RBAC, and renews API server certificates that expire within 180 days. `upgrade node` fetches ClusterConfiguration, upgrades the static Pod manifests (control plane only), and upgrades the kubelet config. — [UPG](https://v1-32.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)

### Inferences
- The procedure on the v1.32 page is structurally the same as in earlier releases. What is new for 1.32 is in the changelog (upgrade phases, removed flags), not in this page.

### Gaps
- The v1.32 page content was read from the website `release-1.32` branch source. The rendered v1-32.docs.kubernetes.io page returned HTTP 200 but was not diffed against that source.

## Q4: kubeadm-specific urgent or action-required items in CHANGELOG-1.32 (removed flags and feature gates, upgrade phases, etcd version)

### Takeaway
kubeadm 1.32 adds phase support to `kubeadm upgrade apply` and `upgrade node`, which affects users who skip addons. It also removes several deprecated no-op flags (`upgrade apply --feature-gates`, the `upgrade diff --*-manifest` flags, `--experimental-output`) and the `experimental-cert-rotation` sub-phase. `EtcdLearnerMode` goes GA and a new `NodeLocalCRISocket` alpha gate appears. Default etcd is 3.5.16-0, CoreDNS v1.11.3 and pause 3.10. There are no kubeadm items in the formal "Urgent Upgrade Notes" section.

### Cited Findings
**Upgrade phases (new in 1.32)**
- `kubeadm upgrade apply` now supports phases. Use `kubeadm upgrade apply phase <phase-name>` or `kubeadm upgrade apply --skip-phases <names>` (PR #126032). — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)
- `kubeadm upgrade node` supports `addon` and `post-upgrade` phases, for example `kubeadm upgrade node --skip-phases addon`. "If you were previously skipping an addon subphase on `kubeadm init` you should now skip the same addon when calling `kubeadm upgrade apply` and `kubeadm upgrade node`." `post-upgrade` is a no-op for now (PR #127242). — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)

**Removed flags and sub-phases**
- Removed the deprecated no-op flags `--feature-gates` for `kubeadm upgrade apply`, and `--api-server-manifest`, `--controller-manager-manifest` and `--scheduler-manifest` for `kubeadm upgrade diff` (PR #127123). — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)
- Removed `--experimental-output`; use `--output`. This affects `kubeadm config images list`, `kubeadm token list`, `kubeadm upgrade plan` and `kubeadm certs check-expiration` (PR #126914). — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)
- Removed the deprecated `init kubelet-finalize` sub-phase `experimental-cert-rotation`; use `enable-client-cert-rotation` (PR #126913). — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)

**Preflight changes**
- Removed the `socat` and `ebtables` preflight checks (PR #127151). Removed the `conntrack` binary preflight check, because conntrack is no longer a kube-proxy dependency in 1.32+ (PR #126953). No more warning when `crictl` is missing, since kubeadm has not relied on it since v1.31 (PR #126596). — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)
- New validation warning when `certificateValidityPeriod` is greater than `caCertificateValidityPeriod` (PR #126538). — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)

**kubeadm feature gates in 1.32**
- `EtcdLearnerMode` is GA and locked to enabled (PR #126374). — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320); also the [kubeadm init feature gates table (v1.32)](https://v1-32.docs.kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/#feature-gates)
- New alpha `NodeLocalCRISocket`. It writes `/var/lib/kubelet/instance-config.yaml` with `containerRuntimeEndpoint` instead of the `kubeadm.alpha.kubernetes.io/cri-socket` Node annotation. If it is enabled during upgrade and the file is missing, kubeadm reads the value from `/var/lib/kubelet/kubeadm-flags.env` (PR #128031). — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320); [kubeadm init feature gates (v1.32)](https://v1-32.docs.kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/#feature-gates)
- Feature gates table for 1.32: `ControlPlaneKubeletLocalMode` (alpha 1.31, default false), `EtcdLearnerMode` (GA 1.32), `NodeLocalCRISocket` (alpha 1.32), `WaitForAllControlPlaneComponents` (alpha 1.30). Deprecated gates: `PublicKeysECDSA` and `RootlessControlPlane`, both deprecated in 1.31. `PublicKeysECDSA` is replaced by `encryptionAlgorithm` in v1beta4. Removed gates: `UpgradeAddonsBeforeControlPlane` (removed 1.31), plus older ones. — [kubeadm init feature gates (v1.32)](https://v1-32.docs.kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/#feature-gates)
- `WaitForAllControlPlaneComponents` now respects `--bind-address`, `--advertise-address` and `--secure-port`. It uses `/livez` for the apiserver and scheduler and `/healthz` for kube-controller-manager (PR #128474). — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)

**Manifests and addons**
- kube-scheduler static Pod probes switched to `/livez` (startup and liveness) and `/readyz` (readiness), replacing `/healthz` (PR #126945). — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)
- The kubeadm-managed Corefile `cache` plugin gained `disable success` and `disable denial` (PR #128359). CoreDNS upgraded to v1.11.3 (PR #126449). corefile-migration updated to v1.0.24. — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)
- Extra env vars in kubeadm-managed PodSpecs are now sorted alphanumerically (PR #126743). This may show up as a manifest diff on upgrade. — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)

**Versions bundled by kubeadm v1.32.0**
- `DefaultEtcdVersion = "3.5.16-0"`. `SupportedEtcdVersion` maps 1.29, 1.30, 1.31 and 1.32 all to `3.5.16-0`. `CoreDNSVersion = "v1.11.3"`, `PauseVersion = "3.10"`. — [kubeadm constants.go @ v1.32.0](https://github.com/kubernetes/kubernetes/blob/v1.32.0/cmd/kubeadm/app/constants/constants.go)
- On the current release-1.32 branch head, `DefaultEtcdVersion` is `3.5.24-0`, because later patch releases bumped it. — [kubeadm constants.go @ release-1.32](https://github.com/kubernetes/kubernetes/blob/release-1.32/cmd/kubeadm/app/constants/constants.go). v1.32.10 notes: "Kubeadm: updated the supported etcd version to v3.5.24 for the skewed control plane version v1.33" (PR #135019). — [CHANGELOG-1.32 v1.32.10](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v13210)
- The etcd client library went to v3.5.16 (PR #127279). — [CL132](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)

**kubeadm config API**
- kubeadm v1beta4 is the current config API. The v1.32 v1beta4 reference says "kubeadm v1.31.x and newer can be used to migrate from v1beta3 to v1beta4" with `kubeadm config migrate`. — [kubeadm Configuration v1beta4 (v1.32 docs)](https://v1-32.docs.kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4/)
- v1beta4 was enabled in 1.31: "Please use the command 'kubeadm config migrate' to migrate your existing v1beta3 configuration to v1beta4." — [CHANGELOG-1.31](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md)

**Relevant kubeadm fixes in 1.32 patch releases** (argues for upgrading to the latest 1.32.x patch)
- v1.32.1: `node.skipPhases` in UpgradeConfiguration was not respected by `kubeadm upgrade node` (PR #129455). Addons disabled in ClusterConfiguration are now skipped during upgrade (PR #129429). — [CHANGELOG-1.32 v1.32.1](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1321)
- v1.32.2: the v1beta4 `Timeouts.EtcdAPICall` was ignored (PR #129862). — [CHANGELOG-1.32 v1.32.2](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1322)
- v1.32.3: fixed a panic when no UpgradeConfiguration was found in the config file (PR #130313). — [CHANGELOG-1.32 v1.32.3](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1323)
- v1.32.7: etcd member promotion failed with "already promoted" (PR #132281). — [CHANGELOG-1.32 v1.32.7](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1327)
- v1.32.9: v1beta3 `ClusterConfiguration.APIServer.TimeoutForControlPlane` was not respected (PR #133755). — [CHANGELOG-1.32 v1.32.9](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1329)
- v1.32.10: `kubeadm upgrade node` fetched the wrong node registration when node name differs from hostname (PR #134364). — [CHANGELOG-1.32 v1.32.10](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v13210)

### Inferences
- Before upgrading, remove from scripts and automation any `kubeadm upgrade apply --feature-gates`, `kubeadm upgrade diff --*-manifest`, and `--experimental-output` usage. These flags now fail as unknown flags.
- Clusters created with skipped addons (for example kube-proxy skipped for Cilium kube-proxy replacement) should pass `--skip-phases addon/kube-proxy` (or the UpgradeConfiguration equivalent) to `upgrade apply` and `upgrade node`. Use 1.32.1+ so `node.skipPhases` is honoured.
- In practice the etcd image does not change on a 1.31 -> 1.32.0 step, because both map to 3.5.16-0 in v1.32.0. Later 1.32.x patches may bump etcd to 3.5.24-0.

### Gaps
- No 1.32 source was found confirming whether kubeadm v1beta3 is formally "deprecated", or naming its planned removal release. Only the migration guidance above was confirmed.
- The exact phase names for `kubeadm upgrade apply` in 1.32 (for example preflight, control-plane, upload-config, kubelet-config, bootstrap-token, addon/coredns, addon/kube-proxy, post-upgrade) were not verified against the 1.32 `kubeadm upgrade` reference page.
