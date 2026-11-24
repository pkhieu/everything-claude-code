# Grafana leads, Atlassian DC lags, ServiceNow splinters

All three platforms have usable MCP servers as of November 2026, but they are at different stages. **Grafana has the strongest one:** Grafana Labs' own `grafana/mcp-grafana` is very actively released (v2.3.0 on 10 Nov 2026). It works with self-hosted Grafana 9.0+, has a real `--disable-write` read-only flag, and accepts service account tokens, basic auth and mTLS. **Jira and Confluence Data Center have no official MCP server at all.** Atlassian's Rovo MCP Server works only with Cloud, and the Jira DC feature request is still at "Gathering Interest". On-prem teams therefore rely on the community project `sooperset/mcp-atlassian`, which is very active (v0.24.8 on 23 Nov 2026, about 6.1k stars) and supports `READ_ONLY_MODE`, PATs, DC OAuth via Application Links and mTLS. **ServiceNow has an official server, MCP Server Console,** which runs on each customer's instance. It accepts only OAuth authorization code grants with JWT tokens and has no global read-only switch. Its community servers show a pattern: the most popular one (`echelon-ai-labs/servicenow-mcp`, about 305 stars) has had no commits since October 2025. The smaller projects that ship releases every month or faster are the ones with real read-only controls. Across all three platforms, "read-only" means different things in different servers. In every case the permissions of the underlying credential are the real backstop.

## Grafana Labs' official server covers self-hosted, with a real write switch

**`grafana/mcp-grafana` is the official, Grafana Labs-maintained server.** It is written in Go, licensed Apache-2.0, and had **about 3.7k stars, 503 forks and 1,069 commits** on 24 Nov 2026 ([GitHub](https://github.com/grafana/mcp-grafana)). It is maintained intensively. Releases v2.0.0 through v2.3.0 shipped between 1 Oct and **10 Nov 2026**, and the official MCP registry lists 0.x versions from February through July 2026, so new versions come out roughly every one to two weeks ([GitHub releases](https://github.com/grafana/mcp-grafana/releases); [MCP Registry](https://registry.modelcontextprotocol.io/v0/servers?search=grafana)). That pace brings breaking changes. In v2.0.0 the project moved to the official MCP Go SDK, removed the Sift tools, split alerting into separate read and write tools, and stopped passing per-request headers to tool calls over SSE. In v2.2.0 it dropped datasource-query support for Grafana versions before 9.0. Pin a version. The server supports stdio, SSE and streamable HTTP transports. It works with **self-hosted Grafana 9.0+ as well as Grafana Cloud**, and ships as a Docker image, a binary and a Helm chart ([GitHub](https://github.com/grafana/mcp-grafana); [Grafana docs](https://grafana.com/docs/grafana-cloud/ai-tools/mcp-servers/cloud-mcp/)).

**The read-only story is the most granular of any server in this report.** `--disable-write` turns off dashboard, folder, incident, alerting, annotation, snapshot and notebook writes. It also turns off the raw-SQL tools (`query_sql`, `query_influxdb`) unless `--enable-query` is set. `--enable-write-tools=<name>` re-enables individual write tools, and about 40 `--disable-<category>` flags remove whole tool groups ([GitHub](https://github.com/grafana/mcp-grafana)). One directory says the server is read-only by design, but the official README contradicts this ([Enterprise DNA](https://enterprisedna.co/directories/mcp/grafana-mcp-grafana)). Note one gap: `--disable-write` combined with `--enable-query` does not make datasources truly read-only, because raw SQL can modify data when the datasource credentials allow it.

**Auth options for Grafana itself:**

- A service account token, set inline or with `GRAFANA_SERVICE_ACCOUNT_TOKEN_FILE`. The file is re-read on every request, so a rotated token takes effect without a restart.
- Basic auth.
- Legacy API keys, which are deprecated.
- Client mTLS (`--tls-cert-file`, `--tls-key-file`, `--tls-ca-file`).
- Per-request `X-Grafana-*` headers in HTTP modes.
- `GRAFANA_EXTRA_HEADERS`, for deployments behind an auth proxy.

**Auth for the MCP endpoint itself:** `MCP_GRAFANA_SERVER_TOKEN` makes clients present a bearer token to the server.

Service account tokens are bound to a single org ([GitHub](https://github.com/grafana/mcp-grafana)). The OSS server documents no OAuth flow to Grafana.

**For Cloud only, Grafana Labs also runs a hosted server at `https://mcp.grafana.com/mcp`.** It uses streamable HTTP and authenticates with **OAuth 2.1**, so the agent gets only the signed-in user's Grafana RBAC permissions. **Read-only is chosen at consent time:** the user ticks Read, Query and Write separately, and a truly read-only session needs both Write and Query cleared. The hosted server does not work with self-hosted Grafana and is billed as part of Grafana Assistant ([Grafana Cloud MCP docs](https://grafana.com/docs/grafana-cloud/ai-tools/mcp-servers/cloud-mcp/)). Sources disagree on its release stage: the docs say public preview, while a "What's new" entry dated July 2026 calls it generally available ([What's new](https://grafana.com/whats-new/2026-07-28-cloud-mcp-server--connect-your-agents-to-grafana-cloud-with-a-single-url/)). A third official option is built into **Tempo**, which can serve a query-only MCP endpoint at `/api/mcp`. It is disabled by default and uses Tempo's normal API auth ([Tempo docs](https://grafana.com/docs/tempo/latest/api_docs/mcp-server/)).

**Few community servers are worth considering:**

- **`dockndevai/mcp-grafana`** is the only one with a stricter default. Its `GRAFANA_MODE` setting defaults to `read-only`, and it authenticates with a service account token over stdio. It has had releases through 23 Nov 2026 but has only about 1 star ([GitHub](https://github.com/dockndevai/mcp-grafana); [MCP Registry](https://registry.modelcontextprotocol.io/v0/servers?search=grafana)).
- **DrDroidLab's server** has 6 stars, no releases and no read-only flag ([GitHub](https://github.com/drdroidlab/grafana-mcp-server)).
- **`grafana/loki-mcp`**, Grafana's earlier prototype, was **archived on 26 Oct 2026** ([GitHub](https://github.com/grafana/loki-mcp)).

## Jira and Confluence DC run on community code because Atlassian ships nothing

**Atlassian's official Rovo MCP Server works only with Cloud.** Its repository describes it as a "cloud-based bridge between your Atlassian Cloud site" and AI tools, and never mentions Data Center ([GitHub atlassian/atlassian-mcp-server](https://github.com/atlassian/atlassian-mcp-server)). Its November 2026 changelog adds OAuth client credentials for service accounts and Jira Align toolsets, and none of the entries mention DC ([Rovo MCP changelog](https://developer.atlassian.com/cloud/rovo-mcp/changelog/)). Atlassian Community answers confirm that it does not support Server or Data Center ([Atlassian Community](https://community.atlassian.com/forums/Jira-questions/Does-the-new-Atlassian-Remote-MCP-Server-support-Server-Data/qaq-p/3112877)). The Jira DC feature request, **JRASERVER-78874, is still "Gathering Interest"**. It had 110 votes and no Atlassian comments when checked in November 2026 ([JRASERVER-78874](https://jira.atlassian.com/browse/JRASERVER-78874)). Atlassian has shipped **one official DC MCP server, but it is for Bitbucket only.** "MCP for Bitbucket Data Center" is a free Marketplace app, and v1.0.2 is dated 28 Sep 2026 ([Marketplace](https://marketplace.atlassian.com/apps/729551276/mcp-for-bitbucket-data-center?tab=overview)). It has no read-only flag. Instead, admins whitelist tools in `mcp-tools.json`, and each call is filtered by the token's REPO and PROJECT permissions ([Bitbucket DC docs](https://confluence.atlassian.com/bitbucketserver/mcp-server-for-bitbucket-1822723944.html)). Searching the Marketplace for Jira or Confluence DC found **no in-product MCP apps** ([Marketplace REST search](https://marketplace.atlassian.com/rest/2/addons?text=MCP&hosting=datacenter&limit=30)).

**`sooperset/mcp-atlassian` is the default choice for on-prem Jira and Confluence.** It is a Python project under the MIT license, and it states that it is not an official Atlassian product. It had about 6.1k stars, offers 98 tools, and supports **Jira Server/DC 8.14+ and Confluence Server/DC 6.0+** ([GitHub](https://github.com/sooperset/mcp-atlassian)). It is maintained intensively: **nine PyPI releases between 8 and 23 Nov 2026**, ending at v0.24.8 ([PyPI](https://pypi.org/project/mcp-atlassian/)).

- **Read-only:** setting `READ_ONLY_MODE=true` "disables all create, update, and delete operations". `ENABLED_TOOLS` (a list of tool names) and `TOOLSETS` (groups of tools) narrow the set further.
- **Auth for DC:** personal access tokens, either set directly or fetched by a command at runtime. It also supports username/password basic auth, DC OAuth through Application Links, and bring-your-own OAuth access tokens.
- **Locked-down networks:** it supports SSL-verify toggles, the OS trust store, mTLS client certificates, passthrough headers and HTTP/SOCKS proxies.
- **Transports:** stdio, SSE and streamable HTTP.

Source for the list above: [.env.example](https://raw.githubusercontent.com/sooperset/mcp-atlassian/main/.env.example). Its `READ_ONLY_MODE` only blocks tools on the MCP side, so the PAT's own Jira permissions still determine what can actually change.

**The only other DC-focused option is `b1ff/atlassian-dc-mcp`.** It is a TypeScript project maintained by an individual, with about 110 stars and 348 commits, and it covers Jira, Confluence and Bitbucket DC through separate npm packages. `@atlassian-dc-mcp/jira` 0.43.2 was published on 1 Nov 2026 ([GitHub](https://github.com/b1ff/atlassian-dc-mcp); [npm](https://registry.npmjs.org/@atlassian-dc-mcp/jira)). It authenticates with PATs only, which can be stored in macOS Keychain. **Its README documents no read-only mode, tool filter or custom-CA options**, which makes it hard to recommend for read-only enforcement unless the PAT's account is itself read-only. Several PyPI forks of sooperset also exist, but they have not been checked in depth ([PyPI](https://pypi.org/project/atlassian-bitbucket-mcp/)).

## ServiceNow's official server trades flexibility for governance

**MCP Server Console is ServiceNow's official server.** It is a ServiceNow Store app that runs a remote MCP server on the customer's own instance, and it is part of ServiceNow's "Action Fabric" alongside its MCP Client and A2A support ([ServiceNow Docs](https://www.servicenow.com/docs/r/intelligent-experiences/mcp-platform-manager-landing.html); [Action Fabric explained](https://www.servicenow.com/community/servicenow-otto-articles/action-fabric-mcp-server-mcp-client-and-a-2-a-explained/ta-p/3557794)).

- **Maintenance:** ServiceNow maintains it as part of the platform release train. The Brazil release notes were updated on 10 Sep 2026 and added tool annotations, OAuth client registration inside the server-creation wizard, a Quickstart server and third-party IdP support ([Release notes](https://www.servicenow.com/docs/r/release-notes/mcp-server-console-rn.html)).
- **Transport:** "Only stateless and remote servers are supported." It uses streamable HTTP, and **stdio is not supported** ([Zurich docs](https://www.servicenow.com/docs/r/zurich/intelligent-experiences/exploring-mcp-server-console.html)).
- **Auth:** the documented setup covers only the **OAuth authorization code grant**. Admins create an inbound integration for each client, and the token format must be **JWT** ([Brazil docs](https://www.servicenow.com/docs/r/intelligent-experiences/create-oauth-inbound-integration-mcp-client.html)). With the default opaque tokens the server returns a bare 403 ([Arcade docs](https://docs.arcade.dev/operate/governance/remote-mcp-servers/servicenow)). No source describes API-key or client-credentials access.
- **Read-only:** there is no global switch. Write capability depends on three things: which tools the admin publishes, the signed-in user's ACLs and roles, and the Brazil tool annotations, which clients can use to apply permission policies.

**Two facts about the official server are still unsettled:**

- **Minimum version:** one source says Zurich Patch 4+ ([FAQ](https://www.servicenow.com/community/servicenow-otto-articles/enable-mcp-and-a2a-for-your-agentic-workflows-with-faqs-updated/ta-p/3373907)), and another says Zurich Patch 9 or Australia Patch 2 ([Action Fabric explained](https://www.servicenow.com/community/servicenow-otto-articles/action-fabric-mcp-server-mcp-client-and-a-2-a-explained/ta-p/3557794)).
- **Licensing:** the Zurich-era FAQ lists Now Assist Pro Plus or Enterprise Plus as a prerequisite. The Brazil docs say no specific licence is needed for the platform console, although a Now Assist application must still be activated ([ServiceNow Docs](https://www.servicenow.com/docs/r/intelligent-experiences/mcp-platform-manager-landing.html)).

It is not available in GCC, and on many developer instances (PDIs) the endpoint must be enabled through a support request ([Developer Advocate blog](https://www.servicenow.com/community/developer-advocate-blog/building-an-mcp-server-on-servicenow-and-connecting-claude-to-it/ba-p/3588171)).

**Among community servers, popularity and maintenance point in opposite directions.**

- **`echelon-ai-labs/servicenow-mcp`** is the most popular (305 stars, 229 forks). Its last commit was **3 Oct 2025**, it has 19 open PRs, and it has never published a release ([GitHub commits](https://github.com/echelon-ai-labs/servicenow-mcp/commits/main)). It supports basic, OAuth and API-key auth, and role-based `MCP_TOOL_PACKAGE` bundles, but **none of those packages is read-only** ([GitHub](https://github.com/echelon-ai-labs/servicenow-mcp)).
- **Three small, individually maintained projects do enforce read-only access,** each released in October 2026. They are compared in the table below.
- **The Happy Technologies "Happy Platform MCP"** (56 stars) supports multiple instances and basic, client-credentials, password and PKCE auth. It has no read-only mode ([GitHub](https://github.com/Happy-Technologies-LLC/mcp-servicenow-nodejs)).

| Server (maintainer) | Latest release | Read-only support | Auth methods |
|---|---|---|---|
| `IvanBBaev/servicenow-mcp-ai` (individual, 13 stars) | npm 3.1.1, 31 Oct 2026 | `SN_READONLY`; plan-by-default writes; per-package read-only; table allow/deny lists | Basic; OAuth 2.1 PKCE, client credentials, refresh, JWT bearer; API key; bearer token; **mTLS** |
| `jschuller/mcp-server-servicenow` (individual, 28 stars) | PyPI 0.9.3, 29 Oct 2026 | `--read-only` hides 7 write tools and refuses non-GET requests | Basic; OAuth client credentials; API key; OAuth 2.1 PKCE |
| `Xerrion/servicenow-platform-mcp` (individual, 4 stars) | PyPI 3.0.0, 13 Oct 2026 | **Read-only by default**; writes blocked when `SERVICENOW_ENV=prod` | OAuth authorization code with PKCE only |

Sources: [IvanBBaev](https://github.com/IvanBBaev/servicenow-mcp-ai); [npm](https://registry.npmjs.org/servicenow-mcp-ai); [jschuller](https://github.com/jschuller/mcp-server-servicenow); [PyPI](https://pypi.org/pypi/mcp-server-servicenow/json); [Xerrion](https://github.com/Xerrion/servicenow-platform-mcp); [PyPI](https://pypi.org/pypi/servicenow-platform-mcp/json).

**No source addresses self-hosted ServiceNow for any of these servers.** Most community servers accept any instance URL, but IvanBBaev's allows only `*.service-now.com` hosts unless others are added to `SN_ALLOWED_HOSTS` ([GitHub](https://github.com/IvanBBaev/servicenow-mcp-ai)). The official console depends on Now Assist, so its availability on customer-hosted instances must be confirmed with ServiceNow.

## Read-only means five different things across these servers

Comparing the recommended servers side by side shows the real decision criteria. Their read-only modes are built in different ways, so they are not equally strong.

| Platform | Recommended server | Maintainer | Activity (Nov 2026) | Read-only mechanism | Auth to backend |
|---|---|---|---|---|---|
| Grafana (self-hosted) | `grafana/mcp-grafana` | Grafana Labs (official) | v2.3.0, 10 Nov | `--disable-write` flag; per-tool and per-category gating | Service account token, basic, mTLS, deprecated API key |
| Grafana Cloud | `mcp.grafana.com/mcp` | Grafana Labs (hosted) | Preview/GA (sources conflict) | Read/Query/Write scope choice at OAuth consent | OAuth 2.1, user RBAC |
| Jira/Confluence DC | `sooperset/mcp-atlassian` | Community (sooperset) | v0.24.8, 23 Nov | `READ_ONLY_MODE` plus tool and toolset filters | PAT, basic, DC OAuth (Application Links), BYOT, mTLS |
| Jira/Confluence DC (alternative) | `b1ff/atlassian-dc-mcp` | Community (b1ff) | jira 0.43.2, 1 Nov | None documented | PAT only |
| ServiceNow | MCP Server Console | ServiceNow (official) | Brazil release, Sep 2026 | None; curated tools, ACLs and annotations | OAuth authorization code (JWT) only |
| ServiceNow (community) | `IvanBBaev/servicenow-mcp-ai` | Individual | 3.1.1, 31 Oct | Global, per-package and per-table, plus plan mode | Basic, OAuth (several grants), API key, bearer, mTLS |

The mechanisms fall into four groups:

- **A server-side flag:** Grafana's `--disable-write`, sooperset's `READ_ONLY_MODE` and jschuller's `--read-only`. An admin controls it.
- **A read-only default:** Xerrion's server and dockndevai's Grafana server. These protect against misconfiguration.
- **A per-user consent choice:** the Grafana Cloud hosted server. The user, not the admin, decides.
- **No server-side mode:** ServiceNow's official console and the Atlassian Bitbucket DC app. These put all control into tool curation and platform ACLs.

The fifth meaning of "read-only" is the one that applies everywhere: a credential that cannot write. Every server's MCP-side gate can be bypassed through some route, such as Grafana's raw-SQL query tools, or a token with broader permissions than the flag assumes. **Pairing any of these servers with a Viewer-role service account, a read-only PAT or an ACL-limited ServiceNow integration user is the only control that does not depend on the server's code.**

## Conclusion

Each vendor has made a different trade-off. Grafana Labs offers both an open-source server for self-hosted deployments and an OAuth-hosted one for Cloud. ServiceNow puts its server inside the platform and controls access with OAuth and ACLs. Atlassian has so far left Jira and Confluence DC customers to the community, even though it has proven the in-product model with Bitbucket DC. For on-prem Jira and Confluence, the practical risk is not a missing feature: `sooperset/mcp-atlassian` already covers read-only mode, PAT auth and mTLS. The risk is depending on a fast-moving community project with weekly releases. If Atlassian ships an official Jira or Confluence DC app modelled on Bitbucket's, it would likely use admin whitelists rather than a read-only flag, which would change how governance works. This is speculation based on the Bitbucket design.

For ServiceNow, the official console's OAuth-only, streamable-HTTP-only design rules out clients that cannot run an OAuth authorization code flow, or that need stdio without a bridge. The community servers that fill that gap are maintained by individuals with tiny star counts. Treat any community ServiceNow server as code you should audit and pin, not as a supported dependency. Until ServiceNow confirms which versions and licences the console requires, and whether it runs on self-hosted instances, plan for those questions to come up in procurement.
