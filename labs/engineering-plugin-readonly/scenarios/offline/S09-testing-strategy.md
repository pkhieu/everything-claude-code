# S09: testing-strategy (offline, compare with mattpocock-skills:tdd)

Skill: `engineering:testing-strategy`
Fixture: `fixtures/terraform-change.diff`

## Prompt

```
/engineering:testing-strategy
Design a test strategy for the Terraform module changed in fixtures/terraform-change.diff:
static checks, policy-as-code, plan-based tests, ephemeral environment tests, and what runs in CI.
Do not use any MCP tool or network.
```

## Checklist

- [ ] Layers: fmt/validate/tflint, policy (OPA/Conftest or similar), plan assertions, integration in ephemeral env.
- [ ] Says which layer catches the issues in the diff.
- [ ] CI placement and run time considered.
