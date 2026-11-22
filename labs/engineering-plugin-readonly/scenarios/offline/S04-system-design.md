# S04: system-design (offline)

Skill: `engineering:system-design`
Fixture: `fixtures/log-pipeline-requirements.md`

## Prompt

```
/engineering:system-design
Read fixtures/log-pipeline-requirements.md. Design the log pipeline: components, data flow,
capacity estimate, failure modes and back-pressure, retention tiers, security (TLS, tenancy).
Include one Mermaid diagram. Do not use any MCP tool or network.
```

## Checklist

- [ ] Capacity math uses the fixture numbers (node count, GB/day).
- [ ] Back-pressure and buffering explained (what happens when the store is down).
- [ ] Multi-tenancy and retention addressed.
- [ ] Mermaid diagram renders.
