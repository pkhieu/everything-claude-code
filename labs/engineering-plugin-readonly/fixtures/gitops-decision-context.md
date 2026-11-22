# Context: GitOps tool choice

- 40 Kubernetes clusters across 3 data centers, private cloud, no direct internet (air-gapped mirrors for images and charts).
- Source control: on-prem GitLab and Bitbucket. Identity: LDAP/AD groups.
- Multi-tenant: ~60 application teams, each with namespaces on several clusters.
- Platform team: 8 engineers. Current state: Helm releases applied by Jenkins jobs; drift is common.
- Requirements: UI for app teams to see sync status, RBAC per team, SSO, progressive delivery later, audit trail.
- Constraints: must run fully offline; upgrades at most twice per year; Prometheus/Grafana for monitoring.
