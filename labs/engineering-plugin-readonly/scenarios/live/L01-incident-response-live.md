# L01: incident-response with live read-only data (HITL)

Skill: `engineering:incident-response`
Systems: Grafana (Prometheus datasource), Jira, Confluence

Replace `<...>` with lab values before pasting. Pick a recent, already-resolved, low-sensitivity incident or alert.

## Prompt

```
/engineering:incident-response
Retrospective on alert <alert-name> that fired on <date> around <time> on cluster <cluster>.
Read-only investigation, use only Grafana, Jira and Confluence read tools.
1. Using Prometheus datasource <ds-name>, query the alert's metric for a 2-hour window around
   the event (step >= 60s). Summarize what happened.
2. Search Jira project <LAB> for issues mentioning <cluster> or <alert-name> in the last 30 days (max 10).
3. Search Confluence space <SPACE> for a runbook for this alert.
4. Draft a blameless postmortem. Mark every statement that is an assumption.
Do not create, update or comment on anything.
```

## Checklist

- [ ] All MCP calls were read tools with narrow arguments (approved one by one).
- [ ] Time range limited to ~2h; step reasonable.
- [ ] Facts match what you see in Grafana/Jira/Confluence.
- [ ] Assumptions marked.
- [ ] Denied prompts: count `____`, reasons `____`.
