# Kubernetes 1.30 -> 1.31 upgrade step: API removals/deprecations and kubeadm upgrade requirements

Source notes:
- CHANGELOG-1.31 = https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md (section "v1.31.0" -> "Changelog since v1.30.0"). PR numbers are given so each item can be traced; PR URLs follow the pattern https://github.com/kubernetes/kubernetes/pull/NNNNNN.
- The v1.31-versioned kubeadm upgrade page (https://v1-31.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/) returned HTTP 503 when fetched. Its content was read from the website source on the `release-1.31` branch, which renders that page: https://github.com/kubernetes/website/blob/release-1.31/content/en/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade.md (there, `currentVersion` = 1.31).

## Which API versions stopped being served in v1.31, and which were newly deprecated (with planned removal version)?

### Takeaway
No stable or beta built-in REST API group/version was removed in v1.31. The one served API version that went away is the alpha `resource.k8s.io/v1alpha2` (DRA), replaced by an incompatible `resource.k8s.io/v1alpha3`. kubeadm's `output.kubeadm.k8s.io/v1alpha2` was also removed. Newly deprecated items: the kubeadm config API `kubeadm.k8s.io/v1beta3` (supported until 1.34 or later), the Node field `status.nodeInfo.kubeProxyVersion`, and the non-CSI volume-limit scheduler plugins (removal planned for 1.32). v1.31 also removed volume plugins, flags, feature gates and the in-tree cloud providers.

### Cited Findings
**API versions removed or no longer served**
- DRA: "Enhanced the Dynamic Resource Allocation (DRA) with an updated version of the resource.k8s.io API group... significant changes have been made, resulting in the new version, v1alpha3, which is not compatible with the previous version." (#125488) — [CHANGELOG-1.31](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md)
  - Verification: `staging/src/k8s.io/api/resource/v1alpha2/types.go` exists at tag v1.30.0 ([v1.30.0 source](https://github.com/kubernetes/kubernetes/blob/v1.30.0/staging/src/k8s.io/api/resource/v1alpha2/types.go)). It returns 404 at tag v1.31.0, where `resource/v1alpha3/types.go` exists instead ([v1.31.0 v1alpha3 source](https://github.com/kubernetes/kubernetes/blob/v1.31.0/staging/src/k8s.io/api/resource/v1alpha3/types.go)).
- "ACTION-REQUIRED: Dynamic Resource Allocation (DRA) drivers using the v1alpha2 kubelet gRPC API are no longer supported and need to be updated." (#124316). Also: "ACTION REQUIRED: The DRA driver's DaemonSet must be deployed with a service account that enables writing ResourceSlice and reading ResourceClaim objects." (#125163) — [CHANGELOG-1.31](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md)
- DRA Pod API field change: in `pod.spec.resourceClaims`, the `source` indirection is no longer necessary (`resourceClaimTemplateName: my-template` directly). (#125116) — [CHANGELOG-1.31](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md)
- kubeadm: "removed the deprecated `output.kubeadm.k8s.io/v1alpha2` API for structured output. Please use v1alpha3 instead." (#124496) — [CHANGELOG-1.31](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md)

**Newly deprecated APIs and fields**
- `kubeadm.k8s.io/v1beta3` is deprecated in favour of the new `v1beta4`: "v1beta3 is now marked as deprecated but will continue to be supported until version 1.34 or later." (#125029) — [CHANGELOG-1.31](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md). The kubeadm blog says "Support for v1beta3 configuration will be removed after a minimum of 3 Kubernetes minor releases." — [Kubernetes blog: kubeadm v1beta4](https://kubernetes.io/blog/2024/08/23/kubernetes-1-31-kubeadm-v1beta4/)
- Node `.status.nodeInfo.kubeProxyVersion` is deprecated in v1.31 and "will be removed in a later release" (KEP-4004). Its value was never accurate. The `DisableNodeKubeProxyVersion` feature gate is on by default in v1.31, so the kubelet no longer sets the field. — [v1.31 release blog](https://kubernetes.io/blog/2024/08/13/kubernetes-v1-31-release/); the gate went to beta (#123845) — [CHANGELOG-1.31](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md)
- A warning is now returned when a PersistentVolume is created or updated with the deprecated annotation `volume.beta.kubernetes.io/mount-options`. (#124819) — [CHANGELOG-1.31](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md)
- kube-scheduler config: the non-CSI volume-limit plugins `AzureDiskLimits`, `CinderLimits`, `EBSLimits` and `GCEPDLimits` are deprecated and removed from the default plugins. Users should switch to `NodeVolumeLimits`, and "Those plugins will be removed in the release 1.32." (#124500) — [CHANGELOG-1.31](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md); [Removals blog](https://kubernetes.io/blog/2024/07/19/kubernetes-1-31-upcoming-changes/)
- cgroup v1 support moved to maintenance mode in v1.31 (no new features, best-effort bug fixes, KEP-4569). — [v1.31 release blog](https://kubernetes.io/blog/2024/08/13/kubernetes-v1-31-release/). A new kubelet flag `--fail-cgroupv1` was added. (#126031) — [CHANGELOG-1.31](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md)
- kube-apiserver `--enable-logs-handler` and log serving are now off by default, with removal scheduled for v1.33. (#125787) — [CHANGELOG-1.31](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md)
- SHA-1 signed certificates (for example on aggregated API servers or webhooks) still need `GODEBUG=x509sha1=1`, and that support ends with go1.24. — [v1.31 release blog](https://kubernetes.io/blog/2024/08/13/kubernetes-v1-31-release/)

**Removed volume plugins, cloud providers and admission plugins (API-visible behaviour)**
- The CephFS in-tree volume plugin (`kubernetes.io/cephfs`) was removed and the `cephfs` volume type is non-functional; use the CephFS CSI driver and re-deploy affected applications (deprecated in v1.28). (#124544) — [CHANGELOG-1.31](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md); [Removals blog](https://kubernetes.io/blog/2024/07/19/kubernetes-1-31-upcoming-changes/)
- The Ceph RBD in-tree plugin (`kubernetes.io/rbd`) and its CSI migration were removed; the `rbd` volume type is non-functional. (#124546) — [CHANGELOG-1.31](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md)
- All in-tree cloud-provider integrations were removed (KEP-2395 complete), including the last in-tree GCP cloud provider and credential provider; use external providers. (#124519, #124886, #124767) — [CHANGELOG-1.31](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md); [v1.31 release blog](https://kubernetes.io/blog/2024/08/13/kubernetes-v1-31-release/)
- The `PersistentVolumeLabel` admission plugin was removed; cloud-pv-admission-labeler is the suggested replacement. (#124505) — [CHANGELOG-1.31](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md)

**Removed command-line flags**
- kubelet `--keep-terminated-pod-volumes` (deprecated in 2017) — Urgent Upgrade Note (#122082). — [CHANGELOG-1.31](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md)
- kubelet `--iptables-masquerade-bit` and `--iptables-drop-bit` (deprecated v1.28). (#122363) — [CHANGELOG-1.31](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md)
- kube-controller-manager `--horizontal-pod-autoscaler-upscale-delay` and `--horizontal-pod-autoscaler-downscale-delay` (non-functional since v1.12) (#124948), plus `--volume-host-cidr-denylist` and `--volume-host-allow-local-loopback` (#124017). — [CHANGELOG-1.31](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md)
- kube-proxy `--proxy-port-range` (deprecated and non-functional). (#126293) — [CHANGELOG-1.31](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md)
- kubectl: `kubectl exec [POD] [COMMAND]` without the `--` separator was removed. (#125437) — [CHANGELOG-1.31](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md)

**Removed feature gates** (each one fails if it is still set in `--feature-gates`)
- `APIPriorityAndFairness` (#125846), `CustomResourceValidationExpressions` (#126136), `CSINodeExpandSecret` (#124462), `ConsistentHTTPGetHandlers` (#124463), `ReadWriteOncePod` (#124329), `ServiceNodePortStaticSubrange` (#124738), `DefaultHostNetworkHostPortsInPodTemplates` (#124417), `SkipReadOnlyValidationGCE` (#124210), `JobReadyPods` (#125168), and `InTreePluginAWSUnregister`, `InTreePluginAzureDiskUnregister`, `InTreePluginAzureFileUnregister`, `InTreePluginGCEUnregister`, `InTreePluginOpenStackUnregister`, `InTreePluginvSphereUnregister` (#124815). — [CHANGELOG-1.31](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md); in-tree gates also in the [v1.31 release blog](https://kubernetes.io/blog/2024/08/13/kubernetes-v1-31-release/)
- GA and locked in v1.31, so the gates can no longer be disabled: `PodDisruptionConditions` (#125461), `JobPodFailurePolicy` (#125442). `StatefulSetStartOrdinal` went to stable, and its gate "will be removed soon" (#125374). — [CHANGELOG-1.31](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md)

**Other Urgent Upgrade Notes and API behaviour changes**
- Urgent: if you use the alpha `RecoverVolumeExpansionFailure` gate, after the upgrade clear `status.allocatedResourceStatus` on any PVC where it is set to `ControllerResizeFailed` or `NodeResizeFailed` (#126108). Custom scheduler plugins must implement a QueueingHint for Pod/Update events (#122234). — [CHANGELOG-1.31](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md)
- The `--encryption-provider-config` file is now loaded with strict deserialization, so a file with duplicate or unknown fields fails. (#124912) — [CHANGELOG-1.31](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md)
- CRDs with an invalid or empty-of-certificates `caBundle` are not served or discovered until fixed. (#124061) — [CHANGELOG-1.31](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md)
- ControllerRevision `data` must now be valid JSON. (#125549) — [CHANGELOG-1.31](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md)
- New beta APIs, off by default: `storage.k8s.io/v1beta1` VolumeAttributesClass (#126145) and `networking.k8s.io/v1beta1` ServiceCIDR/MultiCIDRServiceAllocator (#125021). New alpha API: `coordination.k8s.io/v1alpha1` LeaseCandidate (#124012). — [CHANGELOG-1.31](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md)
- kube-proxy nftables mode (alpha) now needs nft 1.0.1+ and kernel 5.13+. (#124152) — [CHANGELOG-1.31](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md)

### Inferences
- Stable or beta manifests for core workloads need no apiVersion rewrites for 1.30 -> 1.31. Cluster-level breakage is more likely to come from removed flags and feature gates in component manifests or kubeadm `extraArgs`, in-tree Ceph or cloud-provider volumes, DRA alpha objects (v1alpha2 objects become unreachable), and kubeadm config/API changes.
- Because the v1alpha2 → v1alpha3 change is incompatible and v1alpha2 is not served in 1.31, DRA alpha users likely need to delete and recreate their resource.k8s.io objects. That conclusion is drawn from the source-tree evidence; no explicit migration note was found.

### Gaps
- No official statement was found that lists "resource.k8s.io/v1alpha2 no longer served" in those exact words. The evidence is the CHANGELOG note on the incompatible v1alpha3 plus the absence of v1alpha2 types in the v1.31.0 source.

## What does the Deprecated API Migration Guide list for v1.31?

### Takeaway
Nothing. The Deprecated API Migration Guide has no v1.31 section, which confirms that no GA or beta built-in REST API was scheduled for removal in 1.31.

### Cited Findings
- The guide's "Removed APIs by release" sections run v1.32, v1.29, v1.27, v1.26, v1.25, v1.22, v1.16, with no v1.31 entry. — [Deprecated API Migration Guide](https://kubernetes.io/docs/reference/using-api/deprecation-guide/); the page source also has no "1.31" string: [website source](https://github.com/kubernetes/website/blob/main/content/en/docs/reference/using-api/deprecation-guide.md)
- The pre-release blog's "Looking ahead" section names the next scheduled removal as `flowcontrol.apiserver.k8s.io/v1beta3` FlowSchema and PriorityLevelConfiguration in v1.32, with `flowcontrol.apiserver.k8s.io/v1` (available since v1.29) as the replacement. — [Removals blog](https://kubernetes.io/blog/2024/07/19/kubernetes-1-31-upcoming-changes/)

### Inferences
- A pre-1.31 audit should still move `flowcontrol.apiserver.k8s.io/v1beta3` to v1 ahead of the 1.32 step, because v1 is already served in 1.30 and 1.31.

### Gaps
- None.

## What does the official kubeadm "Upgrading kubeadm clusters" page for v1.31 prescribe?

### Takeaway
Upgrade one minor at a time (no skipping), in this order: first control-plane node (`kubeadm upgrade apply`), then the other control-plane nodes (`kubeadm upgrade node`), then the workers. Switch the pkgs.k8s.io repo to the v1.31 minor repo first, drain each node before upgrading its kubelet, and keep swap disabled.

### Cited Findings (all from the [kubeadm-upgrade page, release-1.31 source](https://github.com/kubernetes/website/blob/release-1.31/content/en/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade.md), rendered at [v1-31.docs.kubernetes.io](https://v1-31.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/), unless noted)
- Scope: upgrades from 1.30.x to 1.31.x, and from 1.31.x to 1.31.y. "Skipping MINOR versions when upgrading is unsupported."
- High-level order: (1) primary control-plane node, (2) additional control-plane nodes, (3) worker nodes.
- Prerequisites: read the release notes; the cluster must use static control-plane and etcd pods or external etcd; back up important components (`kubeadm upgrade` does not touch workloads); swap must be disabled.
- Drain: for a **minor** kubelet upgrade you **must** drain the node first. Command: `kubectl drain <node-to-drain> --ignore-daemonsets`, then `kubectl uncordon <node>` afterwards. On control-plane nodes the page runs the drain after `kubeadm upgrade apply/node` and before upgrading the kubelet and kubectl.
- Kubelet and kubeadm versions should match. An older kubelet is allowed within the supported range. All containers are restarted after the upgrade because the container spec hash changes.
- `kubeadm upgrade` takes `--config` with a v1beta4 `UpgradeConfiguration`. It does not reconfigure an existing cluster; for that, see "Reconfiguring a kubeadm cluster".
- etcd note: stalls can occur while etcd restarts. The page's workaround is `killall -s SIGTERM kube-apiserver; sleep 20; kubeadm upgrade ...`.
- Package repository: users of pkgs.k8s.io must enable the repository for the target minor release. — same page and [Changing the Kubernetes package repository (release-1.31 source)](https://github.com/kubernetes/website/blob/release-1.31/content/en/docs/tasks/administer-cluster/kubeadm/change-package-repository.md), which says there is "a dedicated package repository for each Kubernetes minor version", for example `deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.31/deb/ /` or `baseurl=https://pkgs.k8s.io/core:/stable:/v1.31/rpm/`. This is needed only for minor upgrades.
- Find the version: `sudo apt update && sudo apt-cache madison kubeadm`, or `sudo yum list --showduplicates kubeadm --disableexcludes=kubernetes`.
- First control-plane node: `sudo apt-mark unhold kubeadm && sudo apt-get update && sudo apt-get install -y kubeadm='1.31.x-*' && sudo apt-mark hold kubeadm` (yum: `sudo yum install -y kubeadm-'1.31.x-*' --disableexcludes=kubernetes`). Then `kubeadm version`, `sudo kubeadm upgrade plan`, `sudo kubeadm upgrade apply v1.31.x`. Expected output: `[upgrade/successful] SUCCESS! Your cluster was upgraded to "v1.31.x". Enjoy!`. Then upgrade the CNI plugin manually.
- `kubeadm upgrade` renews the certificates it manages automatically; opt out with `--certificate-renewal=false`.
- Addons: since v1.28, kubeadm upgrades CoreDNS and kube-proxy only after all control-plane instances are upgraded. Control-plane upgrades must therefore run sequentially.
- Other control-plane nodes: same steps but `sudo kubeadm upgrade node`. They do not need `upgrade plan` or the CNI upgrade.
- kubelet and kubectl: `sudo apt-mark unhold kubelet kubectl && sudo apt-get update && sudo apt-get install -y kubelet='1.31.x-*' kubectl='1.31.x-*' && sudo apt-mark hold kubelet kubectl`, then `sudo systemctl daemon-reload && sudo systemctl restart kubelet`.
- Workers: upgrade one or a few at a time, following the Linux and Windows node pages. Verify with `kubectl get nodes`.
- Recovery: `kubeadm upgrade` is idempotent; `sudo kubeadm upgrade apply --force` recovers from a bad state. Backups are written to `/etc/kubernetes/tmp/kubeadm-backup-etcd-<date>-<time>` and `kubeadm-backup-manifests-<date>-<time>` and must be cleaned up manually.
- What `upgrade apply` does: checks that the API server is reachable, nodes are Ready and the control plane is healthy; enforces version skew; pre-pulls images; upgrades component configs; upgrades or rolls back the control plane; applies CoreDNS and kube-proxy and their RBAC; renews API server certificates that expire within 180 days.
- Version skew (v1.31 policy): kubelet may be up to three minor versions older than kube-apiserver. All kube-apiserver instances must be upgraded before kube-controller-manager, kube-scheduler and cloud-controller-manager. — [Version Skew Policy (release-1.31 source)](https://github.com/kubernetes/website/blob/release-1.31/content/en/releases/version-skew-policy.md)
- kubeadm v1.31 code: `MinimumControlPlaneVersion = getSkewedKubernetesVersion(-1)` (1.30), `MinimumKubeletVersion = getSkewedKubernetesVersion(-3)` (1.28). — [kubeadm constants.go @ v1.31.0](https://github.com/kubernetes/kubernetes/blob/v1.31.0/cmd/kubeadm/app/constants/constants.go)

### Inferences
- The drain flag on the v1.31 page is `--ignore-daemonsets` only. Workloads using emptyDir may also need `--delete-emptydir-data`; this comes from general kubectl behaviour and is not stated on the page.

### Gaps
- The rendered v1-31.docs.kubernetes.io page returned HTTP 503 during research, so content was taken from the release-1.31 branch source. The two should be identical apart from the version shortcodes.

## What kubeadm-specific urgent upgrade notes and action-required items are in CHANGELOG-1.31?

### Takeaway
The main kubeadm changes are:
- v1beta4 config API enabled and v1beta3 deprecated; the kubeadm-config ConfigMap is now stored as v1beta4.
- etcd 3.5.15-0 is the default, and external or custom etcd older than 3.5.11 is no longer supported.
- `UpgradeAddonsBeforeControlPlane` gate removed; `RootlessControlPlane` deprecated.
- `--feature-gates` is a no-op on upgrade apply/plan; `--experimental-output` deprecated; hidden klog flags disallowed.
- `crictl` is no longer used by kubeadm (the cri-tools package dependency is dropped in 1.32).
- /etc/pki mount behaviour changed.

### Cited Findings (all [CHANGELOG-1.31](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md) unless noted)
- **v1beta4 config API** (#125029). Breaking changes compared with v1beta3:
  - `extraArgs` is now a list of `name`/`value` pairs instead of a map.
  - `JoinConfiguration.discovery.timeout` is replaced by `JoinConfiguration.timeouts.discovery`.
  - `ClusterConfiguration.timeoutForControlPlane` is replaced by `{Init|Join}Configuration.timeouts.controlPlaneComponentHealthCheck`.
  - Migrate with `kubeadm config migrate`. v1beta3 is deprecated but supported "until version 1.34 or later".
  - "The storage configuration in the kube-system/kubeadm-config ConfigMap is now a v1beta4 ClusterConfiguration."
- v1beta4 additions include `extraEnvs`, `ResetConfiguration`, `UpgradeConfiguration`, `dryRun`, `encryptionAlgorithm` (RSA-2048 default / RSA-3072 / RSA-4096 / ECDSA-P256), `dns.disabled` and `proxy.disabled`, `imagePullSerial`, a `timeouts` struct, and `certificateValidityPeriod`/`caCertificateValidityPeriod`. When `--config` is passed to upgrade subcommands, component configs and Init/ClusterConfiguration are deprecated and ignored. — [kubeadm v1beta4 reference (release-1.31)](https://github.com/kubernetes/website/blob/release-1.31/content/en/docs/reference/config-api/kubeadm-config.v1beta4.md); [kubeadm v1beta4 blog](https://kubernetes.io/blog/2024/08/23/kubernetes-1-31-kubeadm-v1beta4/) (example: `kubeadm config migrate --old-config old-v1beta3.yaml --new-config new-v1beta4.yaml`)
- **etcd**:
  - kubeadm now uses the etcd `/livez` and `/readyz` endpoints added in 3.5.11, so "it is no longer possible to deploy a custom etcd version older than 3.5.11 with kubeadm 1.31" (#124465).
  - kubeadm v1.31.0 constants: `MinExternalEtcdVersion = "3.5.11-0"`, `DefaultEtcdVersion = "3.5.15-0"`, `SupportedEtcdVersion` of 3.5.15-0 for 1.29, 1.30 and 1.31, `CoreDNSVersion = "v1.11.1"`, `PauseVersion = "3.10"`. — [constants.go @ v1.31.0](https://github.com/kubernetes/kubernetes/blob/v1.31.0/cmd/kubeadm/app/constants/constants.go)
  - Later 1.31 patches raised these: the current release-1.31 branch shows `DefaultEtcdVersion`/`MinExternalEtcdVersion = "3.5.24-0"` and `CoreDNSVersion = "v1.11.3"`. — [constants.go @ release-1.31](https://github.com/kubernetes/kubernetes/blob/release-1.31/cmd/kubeadm/app/constants/constants.go)
  - Dependency changes in the CHANGELOG: etcd server libraries v3.5.10 → v3.5.13 and etcd client v3.5.14; etcd images v3.5.13 and v3.5.14 were built (#124026, #125235, #124027).
  - kubeadm upgrade may now rotate etcd certificates and restart etcd when kube-apiserver.yaml changes, even if etcd.yaml does not (#124688).
- **Removed**:
  - kubeadm feature gate `UpgradeAddonsBeforeControlPlane`; CoreDNS and kube-proxy upgrade only after all control-plane instances are upgraded (#124715).
  - Deprecated, no-op phase `kubeadm join control-plane-join update-status` (#124373).
  - `output.kubeadm.k8s.io/v1alpha2` (#124496).
  - Hidden klog flags `--alsologtostderr`, `--log-backtrace-at`, `--log-dir`, `--logtostderr`, `--log-file`, `--log-file-max-size`, `--one-output`, `--skip-log-headers`, `--stderrthreshold` and `--vmodule` are no longer allowed (#125179).
- **Deprecated**:
  - The `RootlessControlPlane` feature gate, because core `UserNamespacesSupport` is beta (#124997).
  - The `init kubelet-finalize experimental-cert-rotation` sub-phase, replaced by `enable-client-cert-rotation` (#124419).
  - `--experimental-output`, replaced by `--output`, on `config images list`, `token list`, `upgrade plan` and `certs check-expiration` (#124393).
  - `kubeadm upgrade diff` flags `--api-server-manifest`, `--controller-manager-manifest` and `--scheduler-manifest` (#125779).
  - **`--feature-gates` on `kubeadm upgrade apply/plan` is deprecated and a no-op**. Edit `featureGates` in the kube-system/kubeadm-config ClusterConfiguration instead (#125797).
- **crictl / cri-tools**: kubeadm now uses the CRI client library instead of shelling out to `crictl`. The deb/rpm packages still install `cri-tools` for one more release, but "the `kubeadm` package will stop depending on the `cri-tools` package in Kubernetes 1.32", so scripts must install `crictl` themselves (#124685).
- **CA trust mounts**: kubeadm no longer mounts `/etc/pki` into kube-apiserver and kube-controller-manager. It mounts `/etc/pki/ca-trust` and `/etc/pki/tls/certs` instead (#124361).
- **New and other changes**:
  - `ControlPlaneKubeletLocalMode` alpha gate, with new experimental join phases `control-plane-join-etcd` and `kubelet-wait-bootstrap`.
  - `corednsdeployment` patch target (#124820).
  - `--yes` is allowed together with `upgrade apply --config` (#125566).
  - The `CreateJob` upgrade preflight warns and skips when no node is schedulable, for example a drained single-node cluster (#124503).
  - The kubelet health check uses the configured healthz address and port (#125265).
  - `ResolverConfig` is no longer stored in the global KubeletConfiguration (#124038).
  - The `NodeSwap` preflight check has a new warning (#125157).
  - `--rootfs` is non-experimental (#124375).
  - Fixed: a regression where the KubeletConfiguration was not downloaded during upgrade (#124480).
  - Fixed: `JoinConfiguration.discovery.timeout` being hard-coded to 5m (#125480).

### Inferences
- Before running `kubeadm upgrade apply v1.31.x`, operators should check four things:
  - Custom or external etcd is at least 3.5.11.
  - No removed core feature gates or flags remain in ClusterConfiguration `extraArgs` or kubelet config, for example `--keep-terminated-pod-volumes`, `APIPriorityAndFairness` or the `InTreePlugin*Unregister` gates. Otherwise components fail to start.
  - Any `--feature-gates` they used to pass to upgrade is moved into the ConfigMap.
  - Any automation that parses `kubeadm-config` or uses v1beta3 `extraArgs` maps is updated for v1beta4.
- Automation that relies on `crictl` being installed with the kubeadm package should be fixed now, before the 1.32 step.

### Gaps
- No official statement was found on whether `kubeadm upgrade apply` to 1.31 converts the existing v1beta3 ConfigMap automatically. The CHANGELOG says only that the stored format "is now a v1beta4 ClusterConfiguration".
- The kubeadm v1beta4 reference page on release-1.31 still contains "TODO" placeholders for which kubeadm version migrates to v1beta4. The v1beta4 blog states kubeadm v1.31 can do it.
