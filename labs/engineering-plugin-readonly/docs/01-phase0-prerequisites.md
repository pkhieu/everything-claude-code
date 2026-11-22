# Phase 0: Prerequisites and approvals

Goal: have approvals, read-only credentials and laptop tools ready. No Claude Code session with MCP yet.

## 0.1 Approvals (do first)

- [ ] Confirm with security / data owner that data from Grafana, Jira and Confluence may be sent to the model provider (Anthropic) under the company's agreement. Record the ticket number.
- [ ] Pick **low-sensitivity targets** for the lab: one Grafana folder, one Jira project, one Confluence space.
- [ ] Inform the Grafana / Jira admins that a service account and PATs will be used for a time-boxed lab.

Gate: written approval exists. Without it, stop after Phase 2.

## 0.2 Read-only credentials (Layer 1)

### Grafana service account

1. Administration → Users and access → Service accounts → Add service account.
2. Name: `ai-lab-readonly`. Role: **Viewer**.
3. Restrict folder permissions to the lab folder if your Grafana supports it.
4. Add token. Set expiry to the lab end date (for example 14 days). Store it in a password manager.

Verify (manual, by a human, outside Claude Code):

- [ ] In the Grafana UI, the service account shows role `Viewer`.
- [ ] With the token, a read API call works and a write API call returns 403. Use your usual API client. Do this once, by hand.

### Jira / Confluence (on-prem, Data Center)

1. Create or reuse a dedicated user `ai-lab-readonly`, member of a group with **Browse Projects** only on the lab project and **View** only on the lab space.
2. Log in as that user → Profile → Personal Access Tokens → Create token. Set expiry. Do this for Jira and for Confluence.

Verify:

- [ ] Jira permission helper: user can browse, cannot create, edit, transition or comment.
- [ ] Confluence space permissions: view only.

Gate: TC-P01 and TC-P02 in `test-cases/TEST-CASES.md` pass.

## 0.3 Laptop tools

| Tool | Why | Check |
|------|-----|-------|
| Node.js >= 18 | Lab scripts and hooks | `node -v` |
| Claude Code | The agent | `claude --version` |
| Git Bash (Windows only) | Claude Code runs hooks through it | `bash --version` |
| `uv` | Runs `mcp-atlassian` via `uvx` | `uv --version` |
| `mcp-grafana` binary | Grafana MCP server | `mcp-grafana --help` (Phase 3) |

Corporate TLS: if internal hosts use a private CA, point tools at the CA bundle instead of disabling verification:

```bash
export NODE_EXTRA_CA_CERTS=/path/to/corp-ca.pem     # Node-based tools
export REQUESTS_CA_BUNDLE=/path/to/corp-ca.pem      # Python requests (mcp-atlassian)
export SSL_CERT_FILE=/path/to/corp-ca.pem
```

## 0.4 Environment variables (secrets stay out of files)

`.mcp.json` references `${VAR}`; values live only in your shell session.

bash / zsh:

```bash
export GRAFANA_URL="https://grafana.example.internal"
read -rs GRAFANA_SERVICE_ACCOUNT_TOKEN && export GRAFANA_SERVICE_ACCOUNT_TOKEN
export JIRA_URL="https://jira.example.internal"
read -rs JIRA_PERSONAL_TOKEN && export JIRA_PERSONAL_TOKEN
export CONFLUENCE_URL="https://confluence.example.internal"
read -rs CONFLUENCE_PERSONAL_TOKEN && export CONFLUENCE_PERSONAL_TOKEN
```

PowerShell 7.1+ (`-MaskInput` does not exist in Windows PowerShell 5.1; there, use `-AsSecureString` and convert, or install PowerShell 7):

```powershell
$env:GRAFANA_URL = "https://grafana.example.internal"
$env:GRAFANA_SERVICE_ACCOUNT_TOKEN = Read-Host -MaskInput "Grafana token"
$env:JIRA_URL = "https://jira.example.internal"
$env:JIRA_PERSONAL_TOKEN = Read-Host -MaskInput "Jira PAT"
$env:CONFLUENCE_URL = "https://confluence.example.internal"
$env:CONFLUENCE_PERSONAL_TOKEN = Read-Host -MaskInput "Confluence PAT"
```

Do not put tokens in shell profiles, `.env` files in the lab folder, or `.mcp.json`.

## 0.5 Workspace

```bash
cp -r labs/engineering-plugin-readonly ~/ecc-lab
cd ~/ecc-lab
git init -q && git add -A && git commit -qm "lab baseline"   # lets you diff any change the agent makes
```
