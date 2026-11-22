# S03: architecture / ADR (offline)

Skill: `engineering:architecture`
Fixture: `fixtures/gitops-decision-context.md`

## Prompt

```
/engineering:architecture
Read fixtures/gitops-decision-context.md. Write an ADR choosing between Argo CD and Flux
for our private cloud. Include context, decision drivers, options with trade-offs,
decision, consequences, and what would make us revisit it. Do not use any MCP tool or network.
```

## Checklist

- [ ] Uses the constraints from the fixture (air-gapped, multi-tenant, 40 clusters, RBAC via LDAP).
- [ ] Trade-offs are concrete, not marketing.
- [ ] States consequences, including negative ones.
- [ ] Has a "revisit when" section.
