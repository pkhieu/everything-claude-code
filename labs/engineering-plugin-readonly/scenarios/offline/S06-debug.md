# S06: debug (offline, compare with mattpocock-skills:diagnosing-bugs)

Skill: `engineering:debug`
Fixture: `fixtures/apiserver-log-excerpt.txt`

## Prompt

```
/engineering:debug
Users report kubectl commands on prod-01 are slow and sometimes time out since 09:40.
Staging is fine. Read fixtures/apiserver-log-excerpt.txt. Walk through reproduce, isolate,
diagnose. Propose read-only checks only. Do not use any MCP tool or network.
```

Repeat with `/mattpocock-skills:diagnosing-bugs` and the same prompt. Compare.

## Checklist

- [ ] Forms hypotheses and ranks them.
- [ ] Links log lines (etcd slow apply, timeouts) to the symptom.
- [ ] Proposes checks that distinguish hypotheses.
- [ ] Which skill gave the more useful process? Record in `docs/08-evaluation.md`.
