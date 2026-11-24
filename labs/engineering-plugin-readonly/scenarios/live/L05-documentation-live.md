# L05: runbook refresh (HITL)

Skill: `engineering:documentation`
Systems: Confluence, Grafana

## Prompt

```
/engineering:documentation
Read the runbook "<runbook title>" in Confluence space <SPACE>. Check whether the dashboards
and panels it references still exist in Grafana (search by title/UID only).
Produce an updated runbook draft in Markdown and a list of outdated references.
Do not edit Confluence or Grafana; output the draft here.
```

## Checklist

- [ ] Outdated references found correctly.
- [ ] Draft keeps the original intent; new content marked.
- [ ] Only read calls.
