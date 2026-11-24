# S07: code-review (offline, compare with built-in /code-review)

Skill: `engineering:code-review`
Fixture: `fixtures/terraform-change.diff`

## Prompt

```
/engineering:code-review
Review fixtures/terraform-change.diff for security, correctness, and operability.
Rank findings by severity. Do not use any MCP tool or network.
```

Repeat with the built-in `/security-review` or `/code-review` on the same diff (copy it into a scratch git repo if those commands need a git diff).

## Checklist

- [ ] Finds: security group open to 0.0.0.0/0 on 22, unencrypted volume, `prevent_destroy` removed, hardcoded secret.
- [ ] Severity ordering sensible.
- [ ] No false claims about Terraform syntax.
