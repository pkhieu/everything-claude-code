# S05: tech-debt (offline)

Skill: `engineering:tech-debt`
Fixture: `fixtures/ansible-role-sample.yml`

## Prompt

```
/engineering:tech-debt
Audit fixtures/ansible-role-sample.yml as if it were one role of a larger repo.
Categorize the debt, rate impact and effort, and propose a prioritized remediation plan.
Do not use any MCP tool or network.
```

## Checklist

- [ ] Finds: `shell` instead of modules, no idempotency (`changed_when`), hardcoded versions/passwords, `ignore_errors`, no handlers.
- [ ] Each item has impact and effort.
- [ ] Plan is ordered (quick wins vs. structural).
