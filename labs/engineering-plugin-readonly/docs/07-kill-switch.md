# Kill switch and rollback

Use when anything looks wrong: an unexpected write attempt, a deny you cannot explain, a tool you did not expect, or the lab is over.

## Immediate stop (seconds)

1. Stop the agent: `Esc` (interrupt) in the session, or `Ctrl+C`. For AFK: kill the `node scripts/afk-run.js` process.
2. Disconnect servers: rename the config so no session can load it.

   ```bash
   cd ~/ecc-lab && mv .mcp.json .mcp.json.disabled
   ```

3. Clear tokens from the shell:

   ```bash
   unset GRAFANA_SERVICE_ACCOUNT_TOKEN JIRA_PERSONAL_TOKEN CONFLUENCE_PERSONAL_TOKEN
   ```

   PowerShell:

   ```powershell
   Remove-Item Env:GRAFANA_SERVICE_ACCOUNT_TOKEN, Env:JIRA_PERSONAL_TOKEN, Env:CONFLUENCE_PERSONAL_TOKEN
   ```

## Revoke (minutes)

- Grafana: Service accounts → `ai-lab-readonly` → delete the token (or disable the account).
- Jira and Confluence: log in as `ai-lab-readonly` → Personal Access Tokens → Revoke.
- Remove scheduled AFK jobs (crontab / Task Scheduler).

## Investigate

```bash
cd ~/ecc-lab
grep '"decision":"deny"' logs/guard-decisions.jsonl
tail -n 50 logs/mcp-audit.jsonl
git status && git diff          # did anything change in the workspace?
```

Check the Jira/Confluence history of the lab project and space, and the Grafana audit log if available, for any change by `ai-lab-readonly`.

## End of lab cleanup

- [ ] Tokens revoked, service account and lab user disabled.
- [ ] `claude plugin uninstall engineering@knowledge-work-plugins` if the evaluation says remove.
- [ ] Logs and reports reviewed for sensitive data before sharing; delete `logs/` if not needed.
