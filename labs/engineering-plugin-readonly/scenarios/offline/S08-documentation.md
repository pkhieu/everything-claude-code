# S08: documentation / runbook (offline, compare with tech-doc-composer)

Skill: `engineering:documentation`
Fixture: `fixtures/etcd-restore-notes.md`

## Prompt

```
/engineering:documentation
Turn fixtures/etcd-restore-notes.md into an operational runbook: purpose, when to use,
prerequisites, step-by-step with verification after each step, rollback, escalation.
Do not use any MCP tool or network.
```

Repeat with `/tech-doc-composer` on the same notes. Compare.

## Checklist

- [ ] Every step has a verification.
- [ ] Destructive steps clearly marked with a warning.
- [ ] Missing information flagged as questions, not invented.
