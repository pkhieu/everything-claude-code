# Flowcontrol v1beta3 dominates three quiet upgrade steps

Between Kubernetes 1.30 and 1.33, **exactly one stable-track API version stopped being served: `flowcontrol.apiserver.k8s.io/v1beta3` (FlowSchema and PriorityLevelConfiguration), removed in v1.32** in favour of `flowcontrol.apiserver.k8s.io/v1`, which has been served since v1.29 ([Deprecated API Migration Guide](https://kubernetes.io/docs/reference/using-api/deprecation-guide/#flowcontrol-resources-v132)). Every other removal in the window was alpha. v1.31 dropped `resource.k8s.io/v1alpha2` (DRA), v1.32 dropped `coordination.k8s.io/v1alpha1` and classic DRA, and v1.33 dropped `admissionregistration.k8s.io/v1alpha1` ValidatingAdmissionPolicy. The deprecations with consequences down the line are the kubeadm config API `kubeadm.k8s.io/v1beta3` (deprecated in 1.31, removal "1.34 or later"), DRA `resource.k8s.io/v1beta1` (deprecated in 1.33, removal in 1.36), and core v1 Endpoints (deprecated in 1.33 but never to be removed). The official kubeadm upgrade page gives the same procedure for all three steps, with only the version numbers changed. You switch the pkgs.k8s.io repository to the target minor, run `kubeadm upgrade plan` and `kubeadm upgrade apply` on the first control-plane node and `kubeadm upgrade node` on each remaining control-plane node in turn, then drain, upgrade the kubelet and uncordon node by node, with workers last. Minor versions cannot be skipped. The procedure is not where upgrades break. They break when a component manifest still carries a removed feature gate or flag, or when automation still uses a kubeadm flag that kubeadm has deleted. Those changes accumulate quietly across the three releases.

## One beta API removal hides behind three alpha ones

The Deprecated API Migration Guide lists only one entry for the whole window. Its "Removed APIs by release" sections go v1.32, v1.29, v1.27 and so on, with **no v1.31 or v1.33 section** ([Deprecated API Migration Guide](https://kubernetes.io/docs/reference/using-api/deprecation-guide/); [release-1.33 source](https://github.com/kubernetes/website/blob/release-1.33/content/en/docs/reference/using-api/deprecation-guide.md)). The v1.32 entry says the v1beta3 FlowSchema and PriorityLevelConfiguration "is no longer served as of v1.32". Persisted objects remain readable through v1. One behavioural change comes with the move: in v1, `spec.limited.nominalConcurrencyShares` defaults to 30 only when it is unset, so an explicit 0 now stays 0 ([Deprecated API Migration Guide](https://kubernetes.io/docs/reference/using-api/deprecation-guide/#flowcontrol-resources-v132)). The v1.32 release blog confirms that "there is one API removal in Kubernetes v1.32" ([v1.32 release blog](https://kubernetes.io/blog/2024/12/11/kubernetes-v1-32-release/)). Because v1 is already served in 1.30 and 1.31, the safe course is to rewrite flowcontrol manifests before you start the 1.31 step.

The alpha removals do not appear in the guide because it only tracks beta and GA versions. The changelogs are the only official record of them. Under the deprecation policy, alpha APIs "may be removed in any release without notice" ([v1.33 sneak peek](https://kubernetes.io/blog/2025/03/26/kubernetes-v1-33-upcoming-changes/)), and these removals carry real cleanup work.

In **v1.31**, DRA moved to a new `resource.k8s.io/v1alpha3` that "is not compatible with the previous version" (#125488). DRA drivers that use the v1alpha2 kubelet gRPC API "are no longer supported" (#124316) ([CHANGELOG-1.31](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md)). The v1alpha2 types are present in the v1.30.0 source tree and absent at v1.31.0 ([v1.30.0 source](https://github.com/kubernetes/kubernetes/blob/v1.30.0/staging/src/k8s.io/api/resource/v1alpha2/types.go); [v1.31.0 v1alpha3 source](https://github.com/kubernetes/kubernetes/blob/v1.31.0/staging/src/k8s.io/api/resource/v1alpha3/types.go)). No official note uses the words "v1alpha2 no longer served". That conclusion comes from the source tree.

In **v1.32**, "Coordination.v1alpha1 API is dropped and replaced with coordination.v1alpha2. Old coordination.v1alpha1 types must be deleted before upgrade" (#127857). Classic DRA was also removed, together with the `DRAControlPlaneController` gate. Any PodSchedulingContext objects must be deleted **before** upgrading, because they cannot be removed through the apiserver afterwards (#128003). DRA also moved to `resource.k8s.io/v1beta1` as its storage version, so a downgrade from 1.32 to 1.31 with DRA objects in the cluster is unsupported (#127511) ([CHANGELOG-1.32](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)).

In **v1.33**, support for the `v1alpha1` ValidatingAdmissionPolicy and ValidatingAdmissionPolicyBinding kinds was removed (#129207). Inactive serving code for `authentication.k8s.io/v1alpha1` was deleted (#129186), and `apidiscovery.k8s.io/v2beta1` is now disabled by default (#130347) ([CHANGELOG-1.33](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)).

| Step | API versions no longer served | Newly deprecated (planned removal) |
|---|---|---|
| 1.30 → 1.31 | `resource.k8s.io/v1alpha2` (alpha); kubeadm `output.kubeadm.k8s.io/v1alpha2` | `kubeadm.k8s.io/v1beta3` (1.34 or later); Node `status.nodeInfo.kubeProxyVersion`; scheduler `AzureDiskLimits`/`CinderLimits`/`EBSLimits`/`GCEPDLimits` plugins (1.32); apiserver `--enable-logs-handler` (1.33) |
| 1.31 → 1.32 | **`flowcontrol.apiserver.k8s.io/v1beta3`** (beta); `coordination.k8s.io/v1alpha1`; classic DRA / PodSchedulingContext | ServiceAccount `kubernetes.io/enforce-mountable-secrets` annotation (no deadline); alpha DRA kubelet gRPC API (unspecified) |
| 1.32 → 1.33 | `admissionregistration.k8s.io/v1alpha1` VAP/VAPB; `authentication.k8s.io/v1alpha1` serving code | `resource.k8s.io/v1beta1` (1.36); core v1 Endpoints (never removed); Pod `status.resize`; `service.kubernetes.io/topology-mode` annotation |

Sources for the table: [CHANGELOG-1.31](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md), [CHANGELOG-1.32](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320), [CHANGELOG-1.33](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md).

## The deprecations that matter outlive this window

Most of the deprecations announced in these releases point past 1.33. In 1.31, kubeadm's config API moved to `v1beta4`, and "v1beta3 is now marked as deprecated but will continue to be supported until version 1.34 or later" (#125029) ([CHANGELOG-1.31](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md)). The 1.33 source still says "will be removed in a future release, 1.34 or later" ([kubeadm v1beta3 doc.go, release-1.33](https://github.com/kubernetes/kubernetes/blob/release-1.33/cmd/kubeadm/app/apis/kubeadm/v1beta3/doc.go)). The v1beta4 changes break existing configs:

- **`extraArgs` changes from a map to a list of `name`/`value` pairs.**
- `timeoutForControlPlane` and `discovery.timeout` move into a new `timeouts` struct.
- The kube-system/kubeadm-config ConfigMap is now stored as a v1beta4 ClusterConfiguration.

The documented migration path is `kubeadm config migrate --old-config old-v1beta3.yaml --new-config new-v1beta4.yaml` ([kubeadm v1beta4 blog](https://kubernetes.io/blog/2024/08/23/kubernetes-1-31-kubeadm-v1beta4/)). Any tooling that parses kubeadm-config or generates `extraArgs` maps should be fixed during this window, while both versions still work.

The `resource.k8s.io/v1beta1` DRA API "is deprecated and will be removed in 1.36. Use `v1beta2` instead" (#129970). The v1 Endpoints API is "officially deprecated (though still fully supported)" and will not be removed, though users are pointed to EndpointSlice (#130098). The Pod `status.resize` field "is now deprecated and will no longer be set" and is replaced by the `PodResizeInProgress` and `PodResizePending` conditions (#130733) ([CHANGELOG-1.33](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)).

The Node field `status.nodeInfo.kubeProxyVersion` changed state in each of the three releases, which shows how unreliable "deprecated" can be as a signal. v1.31 deprecated the field and turned the `DisableNodeKubeProxyVersion` gate on by default ([v1.31 release blog](https://kubernetes.io/blog/2024/08/13/kubernetes-v1-31-release/)). v1.32 switched the gate back **off** to give a full year between the 1.29 announcement and clearing the field by default (#126720) ([CHANGELOG-1.32](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320)). v1.33 enabled it again, so the kubelet stops setting the field (#129713) ([CHANGELOG-1.33](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)), and the release blog describes the field as "removed in v1.33" ([v1.33 release blog](https://kubernetes.io/blog/2025/04/23/kubernetes-v1-33-release/)). Monitoring that reads this field should be expected to see empty values from 1.33 on.

Several v1.33 changes are not API removals but behave like them. The gitRepo volume driver is disabled by default; Pods that use it are still admitted but will not run, re-enabling is possible for three versions, and the code is planned for removal in v1.39. Alpha Windows HostNetwork support was removed ([v1.33 release blog](https://kubernetes.io/blog/2025/04/23/kubernetes-v1-33-release/)). New StatefulSets must have a DNS1123-valid `serviceName` (#130233) ([CHANGELOG-1.33](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)).

## Removed gates and flags break more upgrades than removed APIs

A Kubernetes component refuses to start when it is given a feature gate or flag it no longer recognises, and each of these releases removed a long list of them. The **1.31** release removed:

- Feature gates, including `APIPriorityAndFairness`, `CustomResourceValidationExpressions`, `ReadWriteOncePod`, `JobReadyPods` and all six `InTreePlugin*Unregister` gates.
- The kubelet flags `--keep-terminated-pod-volumes`, `--iptables-masquerade-bit` and `--iptables-drop-bit`.
- The CephFS and Ceph RBD in-tree volume plugins and every in-tree cloud provider.

Source for 1.31: [CHANGELOG-1.31](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md); [v1.31 release blog](https://kubernetes.io/blog/2024/08/13/kubernetes-v1-31-release/).

The **1.32** release removed:

- Sixteen GA gates, including `ServerSideApply`, `ValidatingAdmissionPolicy`, `KMSv2` and `HPAContainerMetrics`.
- The deprecated volume-limit scheduler plugins, which must be taken out of any scheduler config that enables them explicitly (#124003).
- The kubelet `--runonce` flag.
- The legacy cloud controllers. kube-controller-manager now accepts only `--cloud-provider` set to `external` or left empty (#128197).

Source for 1.32: [CHANGELOG-1.32](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320).

The **1.33** release removed:

- The GA gates `CPUManager`, `AppArmor`, `AppArmorFields`, `JobPodFailurePolicy`, `DisableCloudProviders` and others.
- kube-apiserver's `--cloud-provider` and `--cloud-config` flags (#130162).

The changelog also tells anyone who sets the now-GA `SidecarContainers` gate explicitly to "please remove it now" (#129731) ([CHANGELOG-1.33](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)).

For kubeadm clusters these settings sit in `ClusterConfiguration.*.extraArgs`, in `featureGates` and in KubeletConfiguration. That makes **the audit of kubeadm config the single most important pre-upgrade check** at every step. The source notes infer this from how kubeadm renders extraArgs into static Pod manifests; the changelogs do not state it as a kubeadm rule.

## The kubeadm upgrade page prescribes the same procedure for all three steps

The official "Upgrading kubeadm clusters" pages for v1.31, v1.32 and v1.33 match in structure. The v1.31 rendered page returned HTTP 503 during research, so it was read from the release-1.31 website source. Each page covers only N-1.x → N.x and N.x → N.y and states that "Skipping MINOR versions when upgrading is unsupported" ([v1.31 source](https://github.com/kubernetes/website/blob/release-1.31/content/en/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade.md); [v1.32 page](https://v1-32.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/); [v1.33 page](https://v1-33.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)).

**Prerequisites.** Read the release notes. The cluster must use static control-plane and etcd pods, or external etcd. Back up important components, since `kubeadm upgrade` does not touch workloads. Swap must be disabled.

**Package repository.** Because `pkgs.k8s.io` has "a dedicated package repository for each Kubernetes minor version", every minor step starts by editing the repository definition. For example, `https://pkgs.k8s.io/core:/stable:/v1.31/deb/` becomes `.../v1.32/deb/` (the rpm path changes the same way) ([Changing the package repository, release-1.31](https://github.com/kubernetes/website/blob/release-1.31/content/en/docs/tasks/administer-cluster/kubeadm/change-package-repository.md); [v1.32 docs](https://v1-32.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/change-package-repository/)).

**Order of operations.**

1. Upgrade the **first control-plane node**, which must have `/etc/kubernetes/admin.conf`. Unhold and install `kubeadm='1.3N.x-*'`, check it with `kubeadm version`, then run `sudo kubeadm upgrade plan` and `sudo kubeadm upgrade apply v1.3N.x`. Upgrade the CNI plugin by hand.
2. On each **additional control-plane node**, one at a time, run `sudo kubeadm upgrade node`. These nodes do not need `plan` or the CNI step. The order matters: since v1.28, kubeadm upgrades CoreDNS and kube-proxy only after every control-plane instance has been upgraded.
3. On every node, upgrade the kubelet. For a minor kubelet upgrade you **must** drain the node first with `kubectl drain <node> --ignore-daemonsets`. Then install `kubelet` and `kubectl` at `1.3N.x-*`, run `systemctl daemon-reload && systemctl restart kubelet`, and finish with `kubectl uncordon`.
4. Upgrade **worker nodes** last, "one node at a time or few nodes at a time", and confirm the result with `kubectl get nodes`.

**Behaviour to expect.** Certificates are renewed automatically unless you pass `--certificate-renewal=false`, and `upgrade apply` renews API server certificates that expire within 180 days. All containers restart because the container spec hash changes. `kubeadm upgrade` is idempotent, `kubeadm upgrade apply --force` recovers from a bad state, and backups under `/etc/kubernetes/tmp/kubeadm-backup-*` must be deleted by hand. While etcd restarts, requests can stall; the documented workaround is `killall -s SIGTERM kube-apiserver; sleep 20` before running `kubeadm upgrade`. The `--config` flag accepts a v1beta4 `UpgradeConfiguration`, but `kubeadm upgrade` will not reconfigure a cluster.

All sources for this procedure: [v1.33 kubeadm upgrade page](https://v1-33.docs.kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/) and its 1.31 and 1.32 equivalents above.

**Version skew.** The kubeadm code enforces skew limits. At every step, `MinimumControlPlaneVersion` is the current minor minus one and `MinimumKubeletVersion` is the current minor minus three, so kubeadm 1.33 accepts only a 1.32 control plane but tolerates kubelets as old as 1.30 ([constants.go @ v1.31.0](https://github.com/kubernetes/kubernetes/blob/v1.31.0/cmd/kubeadm/app/constants/constants.go); [constants.go @ release-1.33](https://github.com/kubernetes/kubernetes/blob/release-1.33/cmd/kubeadm/app/constants/constants.go)). A node must be upgraded with kubeadm of the same minor as the kubeadm that manages it, or one minor newer ([kubeadm skew policy, v1.32](https://v1-32.docs.kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/#version-skew-policy)).

## kubeadm's own changelog adds a different task at each step

The procedure stays the same, but each release adds its own kubeadm requirements on top of it.

**1.30 → 1.31** has the most kubeadm work.

- **etcd.** Custom or external etcd older than **3.5.11** is no longer supported, because kubeadm now probes etcd's `/livez` and `/readyz` endpoints (#124465). kubeadm v1.31.0 deploys etcd 3.5.15-0 and CoreDNS v1.11.1 ([CHANGELOG-1.31](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.31.md); [constants.go @ v1.31.0](https://github.com/kubernetes/kubernetes/blob/v1.31.0/cmd/kubeadm/app/constants/constants.go)).
- **Feature gates on upgrade.** `--feature-gates` on `upgrade apply/plan` becomes a deprecated no-op. Set gates in the kubeadm-config ClusterConfiguration instead (#125797).
- **Removed items.** The `UpgradeAddonsBeforeControlPlane` gate, the `output.kubeadm.k8s.io/v1alpha2` API, and the hidden klog flags are gone.
- **crictl.** kubeadm stops shelling out to `crictl`, and the `kubeadm` package "will stop depending on the `cri-tools` package in Kubernetes 1.32" (#124685).
- **CA trust mounts.** kube-apiserver and kube-controller-manager now mount `/etc/pki/ca-trust` and `/etc/pki/tls/certs` in place of all of `/etc/pki` (#124361).

**1.31 → 1.32** turns the 1.31 deprecations into hard failures.

- **Removed flags.** `upgrade apply --feature-gates`, the `upgrade diff --*-manifest` flags and `--experimental-output` are deleted (#127123, #126914). Scripts that still pass them now fail on an unknown flag.
- **Upgrade phases.** `upgrade apply` and `upgrade node` gain phases. "If you were previously skipping an addon subphase on `kubeadm init` you should now skip the same addon when calling `kubeadm upgrade apply` and `kubeadm upgrade node`" (#127242). This affects, for example, clusters that skipped kube-proxy at init.
- **Patch level for `skipPhases`.** `node.skipPhases` in UpgradeConfiguration is honoured only from v1.32.1 (#129455).
- **Defaults.** `EtcdLearnerMode` goes GA, and the default etcd is 3.5.16-0 ([CHANGELOG-1.32](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v1320); [constants.go @ v1.32.0](https://github.com/kubernetes/kubernetes/blob/v1.32.0/cmd/kubeadm/app/constants/constants.go)).
- **Urgent notes.** The formal v1.32 notes say "There are no urgent upgrade notes".

**1.32 → 1.33** changes defaults more than it removes anything.

- **Beta gates on by default.** `ControlPlaneKubeletLocalMode` and `WaitForAllControlPlaneComponents` move to beta and are enabled by default (#129956, #129620). `EtcdLearnerMode` is removed (#129589).
- **Preflight checks.** `kubeadm upgrade` now runs kernel and OS version preflight checks (#129401), and new checks require `losetup` and `cp` (#129450, #130045). Minimal node images should be checked for these binaries.
- **New plan option.** `upgrade plan` gains `--etcd-upgrade` (#130023).
- **Defaults.** kubeadm deploys etcd 3.5.21-0 and CoreDNS v1.12.0 ([CHANGELOG-1.33](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md); [constants.go @ v1.33.0](https://github.com/kubernetes/kubernetes/blob/v1.33.0/cmd/kubeadm/app/constants/constants.go)).
- **Patch releases.** Later 1.32 and 1.33 patches raise etcd to **3.5.24** (#135019, #135018) and fix etcd-learner promotion and node-name bugs in `upgrade node` ([CHANGELOG-1.32 v1.32.10](https://github.com/kubernetes/kubernetes/blob/release-1.32/CHANGELOG/CHANGELOG-1.32.md#v13210); [CHANGELOG-1.33](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.33.md)).

**Open questions.** Three points remain unconfirmed:

- No official source says whether `kubeadm upgrade apply` to 1.31 rewrites an existing v1beta3 kubeadm-config ConfigMap automatically.
- No official source says whether upgrading to 1.33 repoints existing control-plane kubelets at the local apiserver. The changelog wording mentions only `init` and control-plane `join`.
- The exact phase names for `upgrade apply` in 1.32 were not checked against the reference page.

## Conclusion

The removal schedule in this window shows that the "deprecated API" problem has largely moved out of user manifests and into cluster configuration. Workload YAML barely changed. The upgrade failures that remain come from accumulated config: removed gates and flags in `extraArgs`, kubeadm CLI flags that went from deprecated no-op in 1.31 to deleted in 1.32, and the v1beta3-to-v1beta4 config change. Operators should therefore audit before each step: grep kubeadm-config, static Pod manifests and KubeletConfiguration for every gate and flag the target release removes. Pinning the flowcontrol v1 migration on the 1.32 step alone misses most of the risk. Because kubeadm's minimum control-plane version is always one minor below its own, the three steps must be done in sequence. Each step should go to the latest patch of its minor, since several upgrade-path bugs (`skipPhases`, etcd learner promotion, node-name lookup) were fixed only in patch releases.

Looking past 1.33, the next hard deadlines are kubeadm v1beta3 ("1.34 or later"), DRA `resource.k8s.io/v1beta1` (1.36) and the gitRepo driver code (1.39). Teams that migrate kubeadm configs to v1beta4 during the 1.31–1.33 window, while both versions still work, avoid having a config-format change and a version bump land in the same maintenance window.
