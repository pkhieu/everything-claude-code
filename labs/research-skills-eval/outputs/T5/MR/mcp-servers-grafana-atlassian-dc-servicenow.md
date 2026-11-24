# MCP Servers for Grafana, Jira/Confluence Data Center and ServiceNow

**Date:** 2026-11-24
**Question:** Which MCP servers exist for Grafana, Jira/Confluence Data Center (on-prem) and ServiceNow? For each: maintainer, maintenance activity, read-only mode support, and auth methods.
**Method:** Primary sources only: each project's source repository (cloned at the commit shown, activity counted with `git log`), the vendor's own documentation, and the vendor's own issue tracker. Activity window "last 90 days" = 2026-08-26 to 2026-11-24. Star counts and issue counts are not included because the GitHub API was not reachable from this session.

## Summary

| Target | Server | Maintainer | Activity (last 90 days) | Read-only mode | Auth |
|--------|--------|------------|-------------------------|----------------|------|
| Grafana (self-hosted or Cloud) | `grafana/mcp-grafana` | Grafana Labs (official) | Very active: 348 commits, latest tag v2.3.0 (2026-11-10) | Yes: `--disable-write` | Service account token, username/password, client TLS cert, on-behalf-of tokens (Cloud), forwarded headers |
| Grafana Cloud only | Grafana Cloud MCP (`mcp.grafana.com`) | Grafana Labs (hosted) | Vendor service, no public repo | Yes: untick Write and Query at OAuth consent | OAuth 2.1 only |
| Jira + Confluence Server/DC | `sooperset/mcp-atlassian` | Community (Hyeonsoo Lee), "Not an official Atlassian product" | Very active: 83 commits, v0.24.8 (2026-11-23) | Yes: `READ_ONLY_MODE=true` | PAT, username + password, mTLS client cert, OAuth 2.0 (Application Links), BYOT |
| Jira + Confluence + Bitbucket DC | `b1ff/atlassian-dc-mcp` | Community (Eugene Moroz) | Active: 81 commits, v0.43.2 (2026-11-01) | No server mode; tools carry `readOnlyHint` only | PAT (DC tokens) only |
| Jira + Confluence **Cloud only** | Atlassian Rovo MCP Server (`atlassian/atlassian-mcp-server`) | Atlassian (official) | Active: 33 commits, last 2026-11-13 | Admin permission groups (`read_*` / `write_*`) | OAuth 2.1, API token |
| ServiceNow | MCP Server Console (plugin `snmcpserver`) | ServiceNow (official, on-instance) | Shipped Zurich, Australia, Brazil releases | No read-only switch; you curate each server's tool catalog, ACLs apply | OAuth 2.0 Authorization Code (+ third-party IdP, CIMD); no client credentials |
| ServiceNow | `Happy-Technologies-LLC/mcp-servicenow-nodejs` | Community/vendor (Happy Technologies LLC; Nick Zitzer) | Very active: 278 commits, v7.0.3 (2026-11-15) | No; tools carry `readOnlyHint` only | Basic, OAuth client credentials, OAuth password grant, OAuth auth code + PKCE |
| ServiceNow | `echelon-ai-labs/servicenow-mcp` | Community (copyright 100x Technology Inc) | Stale: last commit 2025-10-03, 0 commits | No; role-based tool packages (`MCP_TOOL_PACKAGE`), custom package possible | Basic, OAuth (client credentials), API key header |
| ServiceNow | `michaelbuckner/servicenow-mcp` | Community (Michael Buckner) | Abandoned: last commit 2025-05-01, 4 commits total | No | Basic, OAuth token, OAuth password grant |

**Bottom line for an on-prem stack:**

- **Grafana:** use `grafana/mcp-grafana` with `--disable-write` and a Viewer service account. It is the only choice for self-hosted Grafana; the hosted Grafana Cloud server does not support self-hosted instances.
- **Jira/Confluence Data Center:** Atlassian has **no official MCP server for Jira or Confluence DC**. Both feature requests are still at "Gathering Interest". `sooperset/mcp-atlassian` is the only candidate with a real server-side read-only mode. The only official Atlassian DC MCP server is for **Bitbucket** DC.
- **ServiceNow:** the official option is the on-instance MCP Server Console. It needs a Now Assist entitlement and supports OAuth Authorization Code only. Of the community servers, only the Happy Technologies one is maintained, and it has no read-only mode. Read-only has to come from the ServiceNow account's roles/ACLs.

---

## 1. Grafana

### 1.1 `grafana/mcp-grafana` (official, open source)

Repository: <https://github.com/grafana/mcp-grafana> (inspected at commit `1db0eff`, 2026-11-23)

**Maintainer**
- Grafana Labs. The repo is under the `grafana` org, Apache-2.0 licensed ([LICENSE](https://github.com/grafana/mcp-grafana/blob/main/LICENSE)), and `CODEOWNERS` assigns Grafana teams such as `@grafana/grafana-assistant-loop` ([CODEOWNERS](https://github.com/grafana/mcp-grafana/blob/main/CODEOWNERS)).
- Grafana's own docs call it "the open source Grafana MCP server" and point to this repo ([Grafana docs: MCP introduction](https://grafana.com/docs/grafana/next/developer-resources/mcp/introduction/)).

**Maintenance activity** (from `git log` on the clone)
- Last commit 2026-11-23; 348 commits in the last 90 days; latest tag `v2.3.0`, 2026-11-10.
- Requires Grafana 9.0 or later ([README, Requirements](https://github.com/grafana/mcp-grafana/blob/main/README.md#requirements)).

**Read-only mode: yes**
- "The `--disable-write` flag provides a way to run the MCP server in read-only mode" ([README, Read-Only Mode](https://github.com/grafana/mcp-grafana/blob/main/README.md#read-only-mode)). It removes dashboard, folder, incident, alerting, OnCall, annotation, snapshot and notebook write tools.
- It also removes the raw-SQL tools `query_sql` and `query_influxdb`, because they "can write when the datasource credentials permit it". `--enable-query` puts them back. PromQL, LogQL, TraceQL and similar query tools stay, because those languages cannot express a write (same section).
- You can opt individual write tools back in with `--enable-write-tools=<name>` ([README, CLI flags](https://github.com/grafana/mcp-grafana/blob/main/README.md#cli-flags-reference)).
- The generic `grafana_api_request` tool is limited in read-only mode to GET plus POST to an allowlist of read-only query endpoints such as `/api/ds/query` ([`tools/api.go`](https://github.com/grafana/mcp-grafana/blob/main/tools/api.go), `readOnlyPOSTEndpoints` and `apiRequestReadOnly`).
- `--disable-query` additionally removes every tool that runs a datasource query ([README, Query-Free Mode](https://github.com/grafana/mcp-grafana/blob/main/README.md#query-free-mode)).
- Grafana recommends RBAC on the service account as well. Each tool lists its minimum RBAC actions and scopes ([README, RBAC Permissions](https://github.com/grafana/mcp-grafana/blob/main/README.md#rbac-permissions)).

**Auth methods (MCP server to Grafana)**
- **Service account token** via `GRAFANA_SERVICE_ACCOUNT_TOKEN`, or read from a file. `GRAFANA_API_KEY` is deprecated ([README, Usage](https://github.com/grafana/mcp-grafana/blob/main/README.md#usage)).
- **Username and password** via `GRAFANA_USERNAME` / `GRAFANA_PASSWORD` (README, Usage and client examples).
- **Client TLS certificate** via `--tls-cert-file` / `--tls-key-file` / `--tls-ca-file` ([README, TLS Configuration](https://github.com/grafana/mcp-grafana/blob/main/README.md#tls-configuration)).
- **On-behalf-of (OBO) auth** with a Grafana Cloud access policy token plus a per-user ID token ([`mcpgrafana.go`](https://github.com/grafana/mcp-grafana/blob/main/mcpgrafana.go), fields `AccessToken` / `IDToken`).
- **Per-request credentials** (streamable-http only): `X-Grafana-Service-Account-Token`, `X-Grafana-Org-Id`, and an allowlist of headers forwarded from the caller (`GRAFANA_FORWARD_HEADERS`, for example `Cookie` behind an SSO proxy). These do not work over SSE ([README, Forwarding Headers](https://github.com/grafana/mcp-grafana/blob/main/README.md#forwarding-headers-from-the-client-streamable-http-only)).

**Auth methods (client to MCP server, HTTP transports)**
- Optional bearer token via `--server-auth-token` / `MCP_GRAFANA_SERVER_TOKEN`. Without it, a non-loopback bind starts but logs a security error ([README, Caller Authentication](https://github.com/grafana/mcp-grafana/blob/main/README.md#cli-flags-reference)).

### 1.2 Grafana Cloud MCP server (official, hosted)

Docs: <https://grafana.com/docs/grafana-cloud/ai-tools/mcp-servers/cloud-mcp/>

- **Maintainer:** Grafana Labs, hosted at `https://mcp.grafana.com/mcp`, Streamable HTTP only ("SSE transport isn't supported") ([Grafana Cloud MCP docs](https://grafana.com/docs/grafana-cloud/ai-tools/mcp-servers/cloud-mcp/)).
- **Scope:** "The Grafana Cloud MCP server doesn't support self-hosted Grafana instances". Self-hosted users are pointed to `mcp-grafana` (same page). **Not usable on-prem.**
- **Maintenance:** vendor-run service with no public repo. The pages read for this note carry no preview/GA label.
- **Read-only:** at the OAuth consent page, untick both "Write access" and "Query access" and keep "Read access". Unticking only Write still allows raw SQL through Query (same page).
- **Auth:** OAuth 2.1 in the browser, scoped to the signed-in user's Grafana RBAC. Access tokens last 1 hour and refresh for up to 30 days. Connecting needs the Assistant Cloud MCP User role or the `grafana-assistant-app.cloud-mcp:access` permission (same page; also [Grafana Cloud: MCP](https://grafana.com/docs/grafana-cloud/machine-learning/mcp/)).

---

## 2. Jira / Confluence Data Center (on-prem)

### 2.0 Official Atlassian status: no Jira/Confluence DC server

- **Jira DC:** feature request [JRASERVER-78874](https://jira.atlassian.com/browse/JRASERVER-78874) ("gather interest in an official MCP Server for Jira Data Center"), created 2025-06-11. Status: Gathering Interest, Unresolved, unassigned, no Atlassian comment.
- **Confluence DC:** feature request [CONFSERVER-101161](https://jira.atlassian.com/browse/CONFSERVER-101161), created 2025-10-09, last updated 2026-10-24. Status: Gathering Interest, Unresolved, no Atlassian comment.
- **Official Atlassian MCP Server (Rovo), Cloud only:**
  - The repo describes it as "a cloud-based bridge between your Atlassian Cloud site and compatible external tools", hosted on Atlassian Cloud. Auth is OAuth 2.1 or API token ([atlassian/atlassian-mcp-server README](https://github.com/atlassian/atlassian-mcp-server/blob/main/README.md); repo inspected at `352a02b`, 2026-11-13, 33 commits in 90 days).
  - Atlassian's security page also describes only Cloud controls (Atlassian Administration, Cloud IP allowlists) ([Understand Atlassian Rovo MCP server](https://support.atlassian.com/security-and-access-policies/docs/understand-atlassian-rovo-mcp-server/)).
  - Read control is at admin level: tools sit in permission groups such as `read_jira` / `write_jira` / `search_jira`, and admins grant or revoke whole groups. `delete_jira` and `manage_jira` are off by default (README, Supported products and tools).
- **Bitbucket DC is the exception:** Atlassian ships an "MCP for Bitbucket Data Center (BBDC) plugin" documented in the Bitbucket DC 10.5 docs ([MCP Server for Bitbucket](https://confluence.atlassian.com/bitbucketserver/mcp-server-for-bitbucket-1822723944.html)).
  - It has no read-only mode. Admins can restrict tools with an `mcp-tools.json` whitelist in `BITBUCKET_HOME/shared/`, and tools are hidden from tokens that lack the required permission (REPO_READ and others) (same page).
  - It does not cover Jira or Confluence.

### 2.1 `sooperset/mcp-atlassian` (community)

Repository: <https://github.com/sooperset/mcp-atlassian> (inspected at `29518e3`, 2026-11-23). Docs site: <https://mcp-atlassian.soomiles.com/docs>

**Maintainer**
- Hyeonsoo Lee (copyright holder in [LICENSE](https://github.com/sooperset/mcp-atlassian/blob/main/LICENSE), MIT). The README states "Not an official Atlassian product" ([README](https://github.com/sooperset/mcp-atlassian/blob/main/README.md)).
- In the last 90 days, 49 of the 83 commits are by Hyeonsoo Lee (`git log` author count), so the project depends heavily on one maintainer.

**Maintenance activity**
- Last commit 2026-11-23; 83 commits in the last 90 days.
- Frequent releases: v0.24.4 (2026-11-13) through v0.24.8 (2026-11-23).

**DC support**
- "Supports both Cloud and Server/Data Center deployments": Confluence Server/DC v6.0+ and Jira Server/DC v8.14+ ([README](https://github.com/sooperset/mcp-atlassian/blob/main/README.md)).
- Some tools are Cloud-only, for example `jira_batch_get_changelogs` and `confluence_get_page_views` ([docs/compatibility.mdx](https://github.com/sooperset/mcp-atlassian/blob/main/docs/compatibility.mdx)).

**Read-only mode: yes**
- `READ_ONLY_MODE` = "Disable write operations (`true`/`false`)" ([docs/configuration.mdx](https://github.com/sooperset/mcp-atlassian/blob/main/docs/configuration.mdx)).
- It is enforced at tool registration: `if ctx["read_only"] and "write" in tool_tags: return False` ([`src/mcp_atlassian/servers/main.py`](https://github.com/sooperset/mcp-atlassian/blob/main/src/mcp_atlassian/servers/main.py)). Write tools are not exposed at all.
- `--enabled-tools` / `ENABLED_TOOLS` gives an explicit allowlist (docs/configuration.mdx).

**Auth methods for Server/DC** ([docs/compatibility.mdx, Authentication Methods](https://github.com/sooperset/mcp-atlassian/blob/main/docs/compatibility.mdx); [docs/authentication.mdx](https://github.com/sooperset/mcp-atlassian/blob/main/docs/authentication.mdx))
- **Personal Access Token:** `JIRA_PERSONAL_TOKEN`, `CONFLUENCE_PERSONAL_TOKEN`. This is the recommended path for DC.
- **Username + password** (the Server/DC form of the Cloud username + API token method).
- **Client certificate (mTLS):** `JIRA_CLIENT_CERT` / `JIRA_CLIENT_KEY`. No username or token needed. Encrypted keys are not supported: a non-empty `*_CLIENT_KEY_PASSWORD` raises a startup error.
- **OAuth 2.0 via Application Links.** Bring Your Own Token (BYOT) is also supported.
- Multi-user HTTP mode: clients send their own PATs per request (docs/authentication.mdx, linking to the HTTP transport guide).
- `*_SSL_VERIFY=false` is available for internal CAs.

### 2.2 `b1ff/atlassian-dc-mcp` (community, DC-only)

Repository: <https://github.com/b1ff/atlassian-dc-mcp> (inspected at `8d19b65`, 2026-11-01)

**Maintainer**
- Individual (GitHub user `b1ff`). In the last 90 days the main human committer is Eugene Moroz (27 commits), alongside a release bot. MIT license ([LICENSE](https://github.com/b1ff/atlassian-dc-mcp/blob/main/LICENSE)).
- Separate packages for Jira, Confluence and Bitbucket DC ([`packages/`](https://github.com/b1ff/atlassian-dc-mcp/tree/main/packages)).

**Maintenance activity**
- Last commit 2026-11-01; 81 commits in the last 90 days; latest tag v0.43.2 (2026-11-01).

**Read-only mode: no**
- There is no read-only flag or tool allowlist in the README or config.
- Read tools are marked with the MCP `readOnlyHint: true` annotation (`readOnlyToolAnnotations` in [`packages/common/src/index.ts`](https://github.com/b1ff/atlassian-dc-mcp/blob/main/packages/common/src/index.ts); CHANGELOG "declare read-only tools with readOnlyHint"). A client can use the hint to auto-deny other tools, but the server still exposes write tools.

**Auth methods**
- DC Personal Access Tokens / HTTP access tokens only: `JIRA_API_TOKEN`, `CONFLUENCE_API_TOKEN`, `BITBUCKET_API_TOKEN` ([README, Generating API Tokens](https://github.com/b1ff/atlassian-dc-mcp/blob/main/README.md)).
- The token is set as `OpenAPI.TOKEN` on the generated client ([`packages/jira/src/jira-service.ts`](https://github.com/b1ff/atlassian-dc-mcp/blob/main/packages/jira/src/jira-service.ts)), which sends it as a bearer token.
- The token can be stored in the macOS Keychain or a `0600` file under `~/.atlassian-dc-mcp/` (README, Token storage).

---

## 3. ServiceNow

### 3.1 ServiceNow MCP Server Console (official, runs on the instance)

**Maintainer**
- ServiceNow. "MCP Server Console is a new application in the Zurich release", "available in the ServiceNow Store", "available with activation of a Now Assist application" ([Zurich release notes](https://www.servicenow.com/docs/r/zurich/release-notes/mcp-server-console-rn.html)).
- The Brazil release notes list it again, updated 2026-09-10 ([release notes, current](https://www.servicenow.com/docs/r/release-notes/mcp-server-console-rn.html)).
- Store listing: [Model Context Protocol Server](https://store.servicenow.com/store/app/6e521bf447713e9482f632c4f16d434e).
- Licensing: the console itself needs no platform licence, but "individual business unit servers will need matching entitlements" ([MCP Server Console landing page](https://www.servicenow.com/docs/r/intelligent-experiences/mcp-platform-manager-landing.html)).

**Maintenance activity**
- Vendor product shipped in Zurich, with features added across Zurich patches, Australia and Brazil:
  - Client ID Metadata Document (CIMD) auth from Australia Patch 1 / Zurich Patch 7.
  - Third-party IdP from Australia Patch 3 / Zurich Patch 10.
  - Microsoft Entra from Australia Patch 4 / Zurich Patch 11.
- Source for the patch levels: [MCP Server Console FAQ](https://www.servicenow.com/community/now-assist-articles/mcp-server-console-faq/ta-p/3550125), written by a ServiceNow employee and posted 2026-05-28.

**Read-only mode: no dedicated switch**
- The release notes and FAQ describe no read-only mode. Instead:
  - Admins choose which tools each server exposes "by adding or removing tools from the catalog".
  - Scripted REST tools support GET, POST and PUT.
  - "MCP does not bypass ServiceNow's native access controls": human tool calls run as the authenticated user, and autonomous agents run as the integration user set up in OAuth.
  - Flows and actions need AI ACLs (all from the [FAQ](https://www.servicenow.com/community/now-assist-articles/mcp-server-console-faq/ta-p/3550125)).
- Admins can set MCP tool annotations, which are returned in `tools/list` "so MCP clients... can apply appropriate permission policies" ([Zurich release notes](https://www.servicenow.com/docs/r/zurich/release-notes/mcp-server-console-rn.html)).
- In practice, read-only = a catalog of read tools + a user/integration account with read roles only.

**Auth methods**
- "Connect to any MCP Server Console client using OAuth 2.0 authentication", with OAuth client registration in the wizard, plus third-party IdP integration ([Zurich release notes](https://www.servicenow.com/docs/r/zurich/release-notes/mcp-server-console-rn.html)).
- The FAQ: "OAuth 2.0 with Authorization Code Grant" is the only supported flow. Client-credentials grant is "not currently supported", listed as a roadmap item ([FAQ](https://www.servicenow.com/community/now-assist-articles/mcp-server-console-faq/ta-p/3550125)).
- No API key or basic auth is documented.

### 3.2 `Happy-Technologies-LLC/mcp-servicenow-nodejs` ("Happy MCP", community/vendor)

Repository: <https://github.com/Happy-Technologies-LLC/mcp-servicenow-nodejs> (inspected at `3e30c71`, 2026-11-22)

**Maintainer**
- Happy Technologies LLC (GitHub org), Apache-2.0 ([LICENSE](https://github.com/Happy-Technologies-LLC/mcp-servicenow-nodejs/blob/main/LICENSE)). It is not a ServiceNow product.
- In the last 90 days, 272 of the 278 commits are by Nick Zitzer (`nickzitzer` / "Nick Z").

**Maintenance activity**
- Last commit 2026-11-22; 278 commits in the last 90 days; latest tag v7.0.3 (2026-11-15).
- 7.0 is a Rust rewrite on npm `next`; 6.x stays `latest` ([README](https://github.com/Happy-Technologies-LLC/mcp-servicenow-nodejs/blob/main/README.md)).

**Read-only mode: no**
- There is no read-only flag or tool filter in the README or core config ([`crates/hpm-core/src/config.rs`](https://github.com/Happy-Technologies-LLC/mcp-servicenow-nodejs/blob/main/crates/hpm-core/src/config.rs)).
- Tools carry a `read_only_hint` annotation ([`crates/hpm-types/src/tool.rs`](https://github.com/Happy-Technologies-LLC/mcp-servicenow-nodejs/blob/main/crates/hpm-types/src/tool.rs)), and 8 MCP resources are read-only (README).
- Enforce read-only through the ServiceNow account's roles.

**Auth methods**
- "OAuth 2.0 & Basic Auth: Per-instance Client Credentials, Resource Owner Password Credentials, and per-user Authorization Code with PKCE" (README).
- Secrets go to the OS keychain; `SN-Register-Instance` never accepts passwords (README).

### 3.3 `echelon-ai-labs/servicenow-mcp` (community, stale)

Repository: <https://github.com/echelon-ai-labs/servicenow-mcp> (inspected at `0625060`, 2025-10-03)

- **Maintainer:** GitHub org `echelon-ai-labs`; MIT, "Copyright (c) 2025 100x Technology Inc" ([LICENSE](https://github.com/echelon-ai-labs/servicenow-mcp/blob/main/LICENSE)).
- **Maintenance activity:** last commit 2025-10-03, no commits in the last 90 days or in the 13+ months before 2026-11-24. Treat it as unmaintained.
- **Read-only mode: no.**
  - `MCP_TOOL_PACKAGE` loads role-based tool subsets defined in `config/tool_packages.yaml` ([README, Tool Packaging](https://github.com/echelon-ai-labs/servicenow-mcp/blob/main/README.md)).
  - No shipped package is read-only. Even `service_desk` includes `create_incident`, `update_incident` and `resolve_incident` ([`config/tool_packages.yaml`](https://github.com/echelon-ai-labs/servicenow-mcp/blob/main/config/tool_packages.yaml)).
  - You can define a custom read-only package in that file.
- **Auth:** `SERVICENOW_AUTH_TYPE=basic | oauth | api_key` (README).
  - OAuth tries the `client_credentials` grant first.
  - The API key is sent in a configurable header.
  - Source: [`auth/auth_manager.py`](https://github.com/echelon-ai-labs/servicenow-mcp/blob/main/src/servicenow_mcp/auth/auth_manager.py).

### 3.4 `michaelbuckner/servicenow-mcp` (community, abandoned)

Repository: <https://github.com/michaelbuckner/servicenow-mcp> (inspected at `39e0910`, 2025-05-01)

- **Maintainer:** Michael Buckner, MIT ([LICENSE](https://github.com/michaelbuckner/servicenow-mcp/blob/main/LICENSE)).
- **Maintenance activity:** 4 commits in total, the last on 2025-05-01.
- **Read-only mode:** none found in README or source.
- **Auth:** Basic (username/password), OAuth token, or OAuth with client ID/secret + username/password ([README, Authentication](https://github.com/michaelbuckner/servicenow-mcp/blob/main/README.md)).

---

## Caveats

- Activity figures come from `git log` on fresh clones made 2026-11-24. Stars, open issues and download counts were not collected, because the GitHub REST API was blocked for this session.
- "Maintainer" for community repos is inferred from the repo owner, the LICENSE copyright and the commit authors in the last 90 days.
- The community landscape for these three systems is large. Only the most-referenced servers, and those with explicit DC support, were reviewed. Others exist (for example, PyPI packages such as `atlassian-jira-mcp`) and were not checked.
- ServiceNow docs URLs are versioned per release, and some links (for example "Call an MCP server from an MCP client") returned 404. The release notes and the ServiceNow-employee FAQ were used instead.
- No server was run against a live system. Read-only claims are from docs and source code, not tested behaviour. For a defence-in-depth setup combining server read-only flags with read-only credentials, see `labs/engineering-plugin-readonly/README.md`.
