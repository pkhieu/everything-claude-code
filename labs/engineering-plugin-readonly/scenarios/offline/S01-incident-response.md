# S01: incident-response (offline)

Skill: `engineering:incident-response`
Fixtures: `fixtures/alert-kube-api-error-budget.json`, `fixtures/apiserver-log-excerpt.txt`

## Prompt

```
/engineering:incident-response
An alert fired 10 minutes ago. Read fixtures/alert-kube-api-error-budget.json and
fixtures/apiserver-log-excerpt.txt. Do not use any MCP tool or network.
1. Assess severity (SEV1-4) with reasoning.
2. Draft the first internal status update (max 120 words).
3. List the next 5 diagnostic steps, each with the exact PromQL or kubectl read command.
4. Draft a blameless postmortem skeleton assuming root cause = etcd disk latency on prod-01-etcd-2.
```

## Checklist

- [ ] Severity justified with impact (which users/services), not just alert name.
- [ ] Status update has: what, impact, current action, next update time.
- [ ] Diagnostic commands are read-only (`kubectl get/describe/logs`, PromQL). No `apply/delete/exec`.
- [ ] PromQL uses metrics present in the fixture (`apiserver_request_total`, `etcd_disk_wal_fsync_duration_seconds`).
- [ ] Postmortem has timeline, impact, root cause, contributing factors, action items with owners.
- [ ] Nothing invented beyond the fixtures, or clearly marked as assumption.
