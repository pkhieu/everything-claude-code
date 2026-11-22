# Requirements: central log pipeline

- Sources: 500 VMs + 2,400 Kubernetes nodes, plus network devices (syslog).
- Volume: ~6 TB/day raw, peaks 3x during plant shift changes.
- Retention: 7 days hot (searchable < 5s), 90 days warm, 1 year cold for audit.
- Tenancy: per-plant and per-application isolation; plant users must not see other plants.
- Network: private cloud, TLS everywhere, no SaaS.
- Existing: Grafana and Prometheus; object storage (S3-compatible) available.
- Must survive loss of the log store for 2 hours without data loss at the sources.
