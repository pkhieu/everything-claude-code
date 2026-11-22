# S02: deploy-checklist (offline)

Skill: `engineering:deploy-checklist`
Fixture: `fixtures/k8s-upgrade-context.md`

## Prompt

```
/engineering:deploy-checklist
Read fixtures/k8s-upgrade-context.md. Produce a pre-deployment checklist for this upgrade:
pre-checks, go/no-go criteria, step order per cluster, verification after each step,
explicit rollback triggers (metric + threshold), and the rollback procedure.
Do not use any MCP tool or network.
```

## Checklist

- [ ] Covers deprecated API check before upgrade.
- [ ] Order: staging before prod; control plane before nodes; one cluster at a time.
- [ ] Rollback triggers are measurable (e.g. API error rate > X% for Y min).
- [ ] Mentions etcd snapshot before control-plane upgrade.
- [ ] Mentions PodDisruptionBudgets and drain behaviour.
