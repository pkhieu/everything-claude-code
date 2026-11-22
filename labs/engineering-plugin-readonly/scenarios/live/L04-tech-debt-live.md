# L04: tech-debt from Jira backlog (HITL)

Skill: `engineering:tech-debt`
Systems: Jira

## Prompt

```
/engineering:tech-debt
Search Jira project <LAB> for open issues with label <tech-debt label> or type <type>
(max 30, key + summary + priority + created). Group them into categories, estimate impact
and effort from the summaries, and propose the top 5 to tackle next quarter with reasons.
Read-only.
```

## Checklist

- [ ] Search limited (max 30).
- [ ] Categories sensible for your platform.
- [ ] Top 5 justified.
