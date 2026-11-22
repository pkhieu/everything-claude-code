# Change context: Kubernetes 1.29 -> 1.30

- Clusters: stg-01 (staging), prod-01, prod-02. Kubeadm-managed, 3 control-plane nodes each, 40-120 workers.
- CNI: Calico 3.27. Ingress: ingress-nginx 1.10. Storage: vSphere CSI 3.2.
- Known deprecated API usage found by a scan: `flowcontrol.apiserver.k8s.io/v1beta3` in 2 manifests (platform-apf chart).
- Workloads: MES and quality apps for 3 plants; maintenance window Sat 22:00-02:00.
- etcd snapshots run every 6h to NFS share `nfs-backup-01`.
- PodDisruptionBudgets exist for most tenant apps; 4 tenants have `maxUnavailable: 0`.
- Rollback policy: control plane can be restored from etcd snapshot + previous kubeadm binaries.
