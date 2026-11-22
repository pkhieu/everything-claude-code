# L02: deploy-checklist with live context (HITL)

Skill: `engineering:deploy-checklist`
Systems: Jira, Confluence, Grafana

## Prompt

```
/engineering:deploy-checklist
Upcoming change <JIRA-KEY>. Read the issue (description and linked issues), read the
Confluence page "<release procedure page>", and check current values of these metrics in
Grafana as a baseline: <metric-1>, <metric-2> (instant queries only).
Produce the pre-deployment checklist with go/no-go criteria and rollback triggers based on
the baselines. Read-only: do not modify anything.
```

## Checklist

- [ ] Uses real baselines for rollback thresholds.
- [ ] Reflects the actual procedure page, not a generic one.
- [ ] Only read calls.
