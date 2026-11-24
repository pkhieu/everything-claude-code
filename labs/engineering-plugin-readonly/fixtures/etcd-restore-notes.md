notes from last restore (fictional)
- stop kube-apiserver on all 3 cp nodes (move manifest out of /etc/kubernetes/manifests)
- etcdctl snapshot restore /backup/etcd-2026-11-01.db --data-dir /var/lib/etcd-restore  (each member, with its own --name and --initial-cluster)
- swap data dir in etcd manifest
- start etcd, check member list + endpoint health
- move apiserver manifest back
- check nodes ready, check some pods
- took ~40 min last time, cert issue on cp-3 (expired peer cert?) not sure how fixed
