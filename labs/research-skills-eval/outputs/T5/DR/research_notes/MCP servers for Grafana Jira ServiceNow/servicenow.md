# ServiceNow MCP Servers (state as of November 2026)

Method note: GitHub API access was blocked in this session, so repository stats (stars, forks, commit counts) come from the rendered GitHub repo pages fetched on 2026-11-24. Package versions and dates come from the PyPI JSON API, the npm registry and the official MCP registry API, all queried on 2026-11-24. Release-date claims use the registry upload timestamps.

## Does ServiceNow provide an official MCP server / MCP support in the platform? Auth, availability, licensing?

### Takeaway
Yes. ServiceNow's official offering is **MCP Server Console**, a ServiceNow Store app that runs a remote MCP server on the customer's own instance. It is part of what ServiceNow calls "Action Fabric", alongside its MCP Client and A2A support.
- **Releases:** it first shipped around Zurich Patch 4 (September 2025). Sources disagree on the minimum version for the current console (see Cited Findings). The latest docs are for the Brazil release, updated 2026-09-10.
- **Transport:** Streamable HTTP only (SSE optional for streaming responses, no stdio).
- **Auth:** OAuth 2.0/2.1 authorization code grant only, with an inbound OAuth integration created per client and JWT token format required.
- **Read-only:** there is no read-only flag. Write control comes from which tools the admin exposes, tool annotations (Brazil) and ServiceNow ACLs/roles.
- **Licensing:** a Now Assist application must be activated. Sources disagree on whether a separate license is needed (see Cited Findings).

### Cited Findings
**What it is and where it runs**
- MCP Server Console "enables secure and governed access to functionality on a ServiceNow instance for AI applications". The current docs page is for the Brazil release, updated September 10, 2026 — [ServiceNow Docs: MCP Server Console](https://www.servicenow.com/docs/r/intelligent-experiences/mcp-platform-manager-landing.html)
- Action Fabric is "ServiceNow's framework for connecting AI agents across your enterprise". It has three components: MCP Server Console, MCP Client and A2A. The article was posted 2026-06-16 by Ashley Snyder (ServiceNow employee) — [ServiceNow Community: Action Fabric explained](https://www.servicenow.com/community/servicenow-otto-articles/action-fabric-mcp-server-mcp-client-and-a-2-a-explained/ta-p/3557794)
- The server is reached at a per-instance URL. The pattern is `https://<instance>.service-now.com/sncapps/mcp-server/mcp/<server-name>`; the Quickstart server is `sn_mcp_server_default`. There is no shared hosted endpoint. These are third-party sources; I found no official page that states the URL pattern — [developersdigest directory](https://www.developersdigest.tech/mcp-servers/servicenow-mcp-server-console); [Arcade docs](https://docs.arcade.dev/operate/governance/remote-mcp-servers/servicenow)

**Transport and limitations (Zurich docs)**
- "MCP Server Console supports the Streamable HTTP transport." SSE is optional for streaming and "Stdio is not supported." — [ServiceNow Docs (Zurich): Exploring MCP Server Console](https://www.servicenow.com/docs/r/zurich/intelligent-experiences/exploring-mcp-server-console.html)
- "Only stateless and remote servers are supported." — [ServiceNow Docs (Zurich): Exploring MCP Server Console](https://www.servicenow.com/docs/r/zurich/intelligent-experiences/exploring-mcp-server-console.html)
- "MCP resources and prompts aren't supported." — [ServiceNow Docs (Zurich): Exploring MCP Server Console](https://www.servicenow.com/docs/r/zurich/intelligent-experiences/exploring-mcp-server-console.html)
- The MCP rate limit "is not configurable currently". — [ServiceNow Docs (Zurich): Exploring MCP Server Console](https://www.servicenow.com/docs/r/zurich/intelligent-experiences/exploring-mcp-server-console.html)

**Authentication**
- AI clients connect using OAuth 2.0. Admins create an OAuth inbound integration for each client — [ServiceNow Docs (Zurich): Exploring MCP Server Console](https://www.servicenow.com/docs/r/zurich/intelligent-experiences/exploring-mcp-server-console.html)
- The Brazil setup procedure covers only the **"OAuth - Authorization code grant"**:
  - Required role: oauth_admin, mi_admin or admin.
  - Path: MCP Server Console > Configuration > Servers > Set up OAuth, or Machine Identity Console > Inbound integrations.
  - Token Format must be set to **JWT**.
  - Leave "Allow access only to APIs in selected scope" cleared, or clients cannot fetch tools.
  - Source: [ServiceNow Docs (Brazil): Create an OAuth inbound integration for an MCP client](https://www.servicenow.com/docs/r/intelligent-experiences/create-oauth-inbound-integration-mcp-client.html)
- With the default (opaque) token format, the endpoint returns a bare 403, because it validates only JWTs. This is a third-party troubleshooting note — [Arcade docs](https://docs.arcade.dev/operate/governance/remote-mcp-servers/servicenow)
- "OAuth 2.1 is enforced on every connection" — [ServiceNow Community: Action Fabric explained](https://www.servicenow.com/community/servicenow-otto-articles/action-fabric-mcp-server-mcp-client-and-a-2-a-explained/ta-p/3557794)
- The MCP server requires OAuth ("Oauth is required"). By contrast, ServiceNow's *MCP client* (calling external servers) supports Authless, API key and OAuth 2.1, over Streamable HTTP/SSE only, with protocol version 2025-06-18 — [ServiceNow Community: Enable MCP and A2A (FAQ)](https://www.servicenow.com/community/servicenow-otto-articles/enable-mcp-and-a2a-for-your-agentic-workflows-with-faqs-updated/ta-p/3373907)
- Dynamic client registration is not supported, so clients are registered manually. Custom Scripted REST tools support GET/POST/PUT but not DELETE. These come from a search summary of community material and are not verified on an official page — [ServiceNow Community: Implementing MCP in ServiceNow](https://www.servicenow.com/community/ceg-ai-coe-articles/implementing-the-model-context-protocol-in-servicenow-a/ta-p/3541020)
  - Conflict: the Action Fabric article lists "Scripted REST APIs with full CRUD (GA May 2026)" — [Action Fabric explained](https://www.servicenow.com/community/servicenow-otto-articles/action-fabric-mcp-server-mcp-client-and-a-2-a-explained/ta-p/3557794)

**Brazil release features (release notes updated 2026-09-10)**
- New in Brazil:
  - OAuth client registration inside the server-creation wizard.
  - Tool **annotations** on all tool types, exposed in tools/list "so clients can apply permission policies".
  - A preconfigured Quickstart Server for incidents and cases.
  - MCP Apps (interactive UI).
  - Third-party IdP for user auth.
  - Servers and tools created from categories, including Now Assist skills.
  - Earlier EA items: tools from Playbooks and Searches, and a monitoring dashboard.
  - Source: [ServiceNow Release Notes: MCP Server Console (Brazil)](https://www.servicenow.com/docs/r/release-notes/mcp-server-console-rn.html)
- The app is distributed via the ServiceNow Store and "requires activation of a Now Assist application" — [ServiceNow Release Notes: MCP Server Console](https://www.servicenow.com/docs/r/release-notes/mcp-server-console-rn.html); Store listing: [ServiceNow Store](https://store.servicenow.com/store/app/6e521bf447713e9482f632c4f16d434e)

**Tool types and GA dates**
- Now Assist Skills (GA Dec 2025)
- Knowledge Graph (GA May 2026)
- Subflows & Actions (GA May 2026)
- Scripted REST APIs (GA May 2026)
- Source: [ServiceNow Community: Action Fabric explained](https://www.servicenow.com/community/servicenow-otto-articles/action-fabric-mcp-server-mcp-client-and-a-2-a-explained/ta-p/3557794)

**Version requirements (sources conflict)**
- The FAQ article lists "Zurich Patch 4+, Yokohama Patch 11+ recommended", plus AI Agents store app 6.x+ and MCP Client store app 1.1+. Published 2025-09-08, last edited 2026-04-09 (the page shows "09-04-2026") — [Enable MCP and A2A FAQ](https://www.servicenow.com/community/servicenow-otto-articles/enable-mcp-and-a2a-for-your-agentic-workflows-with-faqs-updated/ta-p/3373907)
- Conflict: "MCP Server Console requires Zurich Patch 9 or Australia Patch 2 as the minimum platform version" — [Action Fabric explained (2026-06)](https://www.servicenow.com/community/servicenow-otto-articles/action-fabric-mcp-server-mcp-client-and-a-2-a-explained/ta-p/3557794)
- The Zurich family GA date is listed as September 10, 2025 — [Zurich Release Notes PDF](https://downloads.docs.servicenow.com/pdf/enus/servicenow-zurich-release-notes-enus.pdf)

**Licensing (sources conflict)**
- The FAQ lists "Now Assist SKU (Pro Plus, Enterprise Plus), AI SKUs" as a prerequisite. Now Assist skills invoked via the MCP server "consume their usual number of assists when invoked plus 1 assist" — [Enable MCP and A2A FAQ](https://www.servicenow.com/community/servicenow-otto-articles/enable-mcp-and-a2a-for-your-agentic-workflows-with-faqs-updated/ta-p/3373907)
- Conflict: the Brazil docs say "You don't need specific licences to use the platform MCP Server Console". Business-unit servers need matching entitlements — [ServiceNow Docs (Brazil): MCP Server Console](https://www.servicenow.com/docs/r/intelligent-experiences/mcp-platform-manager-landing.html)

**Availability**
- GCC: "MCP Server - not at this time" (per the FAQ) — [Enable MCP and A2A FAQ](https://www.servicenow.com/community/servicenow-otto-articles/enable-mcp-and-a2a-for-your-agentic-workflows-with-faqs-updated/ta-p/3373907)
- On many sandboxes and PDIs the `/sncapps/mcp-server` path is not enabled by default, and a support request may be needed — [ServiceNow Developer Advocate blog (Travis Toulson)](https://www.servicenow.com/community/developer-advocate-blog/building-an-mcp-server-on-servicenow-and-connecting-claude-to-it/ba-p/3588171)

### Inferences
- **Licensing:** this looks like a policy shift. Early (Zurich-era) material ties MCP Server to Now Assist Pro Plus / Enterprise Plus. The Brazil docs say the platform console needs no specific licence, but Now Assist must still be activated and skill-backed tools consume assists. Buyers should confirm with ServiceNow.
- **Read-only:** the official server has no global read-only switch. Write capability is bounded by:
  - which tools the admin exposes (for example, only Now Assist summarization skills or GET-only Scripted REST tools);
  - OAuth user ACLs/roles, since the authorization code grant acts as the user;
  - Brazil's tool annotations (readOnlyHint etc.), which clients like Claude can use to gate approvals.
- **Client fit:** clients that only speak stdio need a bridge such as mcp-remote. Clients that require dynamic client registration need manual client configuration.

### Gaps
- I did not find an official ServiceNow doc page that states the exact MCP endpoint URL pattern; only third-party sources give it.
- The exact Store app version and release date of the latest MCP Server Console were not visible.
- Whether MCP Server Console is supported on self-hosted (customer-hosted/on-prem) ServiceNow deployments: no source found.
- Whether client-credentials or API-key auth is accepted by the server: none found. The official docs describe only the authorization code grant.

## What community ServiceNow MCP servers exist? Are they maintained? Read-only / tool packages?

### Takeaway
The most-starred community server is **echelon-ai-labs/servicenow-mcp** (~305 stars). It has the richest role-based `MCP_TOOL_PACKAGE` system, but no read-only package, and it looks **stale**: last commit 2025-10-03, no releases. In late 2026 the actively maintained options with real read-only controls are:
- **jschuller/mcp-server-servicenow** (`--read-only`; PyPI 0.9.3, 2026-10-29)
- **IvanBBaev/servicenow-mcp-ai** (`SN_READONLY`, plan mode, per-package read-only, mTLS; npm 3.1.1, 2026-10-31)
- **Xerrion/servicenow-platform-mcp** (read-only by default; PyPI 3.0.0, 2026-10-13)
- **Happy-Technologies-LLC** Happy Platform MCP (multi-instance, OAuth; Apache-2.0)

### Cited Findings

#### 1. echelon-ai-labs/servicenow-mcp (Python, MIT) — community (Echelon AI Labs org)
- **URL:** https://github.com/echelon-ai-labs/servicenow-mcp
- **Stats:** 305 stars, 229 forks, 42 commits, 15 open issues, 19 open PRs. No releases published — [GitHub repo](https://github.com/echelon-ai-labs/servicenow-mcp)
- **Activity:** most recent commits are 2025-10-03 ("Fixed repo url in README.md (#41)", "expose retrieving incident details (#38)"), then 2025-08-02 and 2025-06-30. No commits in roughly 13 months as of 2026-11-24 — [GitHub commits](https://github.com/echelon-ai-labs/servicenow-mcp/commits/main)
- **Auth:** `SERVICENOW_AUTH_TYPE` is `basic`, `oauth` or `api_key`.
  - Basic: `SERVICENOW_USERNAME`/`SERVICENOW_PASSWORD`.
  - OAuth: `SERVICENOW_CLIENT_ID`, `SERVICENOW_CLIENT_SECRET`, `SERVICENOW_TOKEN_URL`.
  - API key: `SERVICENOW_API_KEY`.
  - Source: [GitHub repo README](https://github.com/echelon-ai-labs/servicenow-mcp)
- **Transports:** stdio (`python -m servicenow_mcp.cli`) and SSE (`servicenow-mcp-sse`, default 0.0.0.0:8080, endpoints `/sse` and `/messages/`) — [GitHub repo README](https://github.com/echelon-ai-labs/servicenow-mcp)
- **Tool packages:** `MCP_TOOL_PACKAGE` takes `service_desk`, `catalog_builder`, `change_coordinator`, `knowledge_author`, `platform_developer`, `system_administrator`, `agile_management`, `full` (default) or `none`. Packages are defined in `config/tool_packages.yaml`, and a `list_tool_packages` tool lists them. There is **no read-only package** — [GitHub repo README](https://github.com/echelon-ai-labs/servicenow-mcp)

#### 2. jschuller/mcp-server-servicenow (Python, MIT) — community (individual, jschuller)
- **URL:** https://github.com/jschuller/mcp-server-servicenow. PyPI: https://pypi.org/project/mcp-server-servicenow/
- **Stats:** 28 stars, 10 forks, 177 commits — [GitHub repo](https://github.com/jschuller/mcp-server-servicenow)
- **Latest version:** PyPI 0.9.3, uploaded 2026-10-29 — [PyPI JSON API](https://pypi.org/pypi/mcp-server-servicenow/json)
- **MCP registry:** published as `io.github.jschuller/mcp-server-servicenow`, versions 0.3.1 through 0.9.3 — [MCP Registry API](https://registry.modelcontextprotocol.io/v0/servers?search=servicenow&limit=50)
- **Read-only:** the `--read-only` flag hides the 7 write tools and refuses any non-GET request at the HTTP layer — [GitHub repo](https://github.com/jschuller/mcp-server-servicenow); [Socket.dev](https://socket.dev/pypi/package/mcp-server-servicenow)
- **Auth:**
  - Basic auth with an integration user ("Web service access only").
  - OAuth client credentials for headless use.
  - API keys.
  - OAuth 2.1 with PKCE for remote deployment.
  - mTLS is not mentioned.
  - Source: [GitHub repo](https://github.com/jschuller/mcp-server-servicenow)
- **Transports:** stdio (uvx) and Streamable HTTP — [GitHub repo](https://github.com/jschuller/mcp-server-servicenow)
- **Tools and compatibility:** 20 tools across Table API (6), CMDB (5), System (4) and Update sets (5), plus 5 resources and 4 skills. Works on "any release from Tokyo up" — [GitHub repo](https://github.com/jschuller/mcp-server-servicenow)

#### 3. IvanBBaev/servicenow-mcp-ai (Node/TypeScript, GPL-3.0) — community (individual, IvanBBaev)
- **URL:** https://github.com/IvanBBaev/servicenow-mcp-ai. npm: `servicenow-mcp-ai`
- **Stats:** 13 stars, 4 forks — [GitHub repo](https://github.com/IvanBBaev/servicenow-mcp-ai)
- **Latest version:** npm 3.1.1, published 2026-10-31 — [npm registry](https://registry.npmjs.org/servicenow-mcp-ai)
- **MCP registry:** `io.github.IvanBBaev/servicenow-mcp-ai`, versions 2.0.1 to 3.1.1. 3.1.x declares a remote `https://{servicenow_mcp_ai_host}/mcp` — [MCP Registry API](https://registry.modelcontextprotocol.io/v0/servers?search=servicenow&limit=50)
- **Community post:** describes table allow/deny lists, read-only packages, global read-only mode and protected system tables — [ServiceNow Community post](https://www.servicenow.com/community/developer-forum/servicenow-mcp-ai-an-open-source-mcp-server-that-lets-ai/td-p/3613320)
- **Read-only and write controls:**
  - `SN_READONLY=true` refuses all create/update/delete.
  - `SN_WRITE_MODE=plan` (default) previews writes; `apply` executes them.
  - `SN_PACKAGES_READONLY` removes write tools per package.
  - `SN_TABLES_ALLOW`/`SN_TABLES_DENY` restrict reachable tables.
  - `SN_PROTECTED_TABLES_WRITE=deny` refuses writes to protected system tables.
  - With `SN_ENV=prod`, a profile stays in plan mode unless `SN_PROD_WRITES=I_UNDERSTAND` is set.
  - Source: [GitHub repo](https://github.com/IvanBBaev/servicenow-mcp-ai)
- **Auth:**
  - Basic (`SN_USER`/`SN_PASSWORD`).
  - OAuth 2.1 Authorization Code + PKCE (`npx servicenow-mcp-ai login`, recommended).
  - OAuth grants: `client_credentials`, `refresh_token`, `jwt_bearer`, and `password` (ROPC, marked deprecated).
  - API key (`SN_API_KEY`, sent as `x-sn-apikey`).
  - Bearer token (`SN_BEARER_TOKEN`/`SN_TOKEN_FILE`).
  - **mTLS** (`SN_TLS_CLIENT_CERT`/`SN_TLS_CLIENT_KEY`, needs the optional `undici` package).
  - Source: [GitHub repo](https://github.com/IvanBBaev/servicenow-mcp-ai)
- **Transports:** stdio (default) and Streamable HTTP (`SN_TRANSPORT=http`, port 3000, bound to 127.0.0.1). The Docker image defaults to HTTP — [GitHub repo](https://github.com/IvanBBaev/servicenow-mcp-ai)
- **Multi-instance:** named profiles (`SN_PROFILE_<NAME>_*`), `SN_ACTIVE_PROFILE`, a runtime `servicenow_use_instance` tool, and a `drift` command to compare two profiles — [GitHub repo](https://github.com/IvanBBaev/servicenow-mcp-ai)
- **Related fork:** a separate registry entry, `io.github.LeassTaTT/servicenow-mcp-ai` (1.1.2 to 2.0.0), has docs at leasstatt.github.io — [MCP Registry API](https://registry.modelcontextprotocol.io/v0/servers?search=servicenow&limit=50); [docs site](https://leasstatt.github.io/servicenow-mcp-ai/)

#### 4. Xerrion/servicenow-platform-mcp (Python, MIT) — community (individual, Xerrion)
- **URL:** https://github.com/Xerrion/servicenow-platform-mcp. PyPI: `servicenow-platform-mcp`
- **Stats:** 4 stars, 0 forks, 143 commits — [GitHub repo](https://github.com/Xerrion/servicenow-platform-mcp)
- **Latest version:** PyPI 3.0.0, uploaded 2026-10-13 — [PyPI JSON API](https://pypi.org/pypi/servicenow-platform-mcp/json)
- **Read-only (default):** `MCP_TOOL_PACKAGE` takes `readonly` (default), `core_readonly`, `full` or `none`. `SERVICENOW_ENV=prod|production` (default `prod`) blocks writes — [GitHub repo](https://github.com/Xerrion/servicenow-platform-mcp)
- **Write guards:**
  - Changes need a preview before `apply_change`.
  - Preview tokens are single-use and expire after 300 seconds.
  - Catalog changes need the `service_catalog_write` group.
  - The README says the guardrails "reduce risk but are not a guarantee".
  - Source: [GitHub repo](https://github.com/Xerrion/servicenow-platform-mcp)
- **Auth:** OAuth authorization code with PKCE (S256), public client, scope `useraccount`. Basic, API key and mTLS are not mentioned — [GitHub repo](https://github.com/Xerrion/servicenow-platform-mcp)
- **Transport:** stdio (`uvx servicenow-platform-mcp`) — [GitHub repo](https://github.com/Xerrion/servicenow-platform-mcp)
- **Sibling project:** `servicenow-devtools-mcp` by the same author, PyPI 0.9.1 uploaded 2026-03-28 — [PyPI JSON API](https://pypi.org/pypi/servicenow-devtools-mcp/json)

#### 5. Happy-Technologies-LLC/mcp-servicenow-nodejs, now "Happy Platform MCP" (Node, Apache-2.0) — community (Happy Technologies LLC; registry name nickzitzer)
- **URL:** https://github.com/Happy-Technologies-LLC/mcp-servicenow-nodejs. npm: `servicenow-mcp-server`
- **Stats and versions:**
  - 56 stars, 34 forks — [GitHub repo](https://github.com/Happy-Technologies-LLC/mcp-servicenow-nodejs)
  - The README references a 6.x line on npm `latest` and a v7.0.3 Rust preview on `next` — [GitHub repo](https://github.com/Happy-Technologies-LLC/mcp-servicenow-nodejs)
  - npm `servicenow-mcp-server` latest is 2.1.10, published 2026-03-30 — [npm registry](https://registry.npmjs.org/servicenow-mcp-server)
  - The v6/v7 versions may live under a different package name; unverified.
  - MCP registry entry: `io.github.nickzitzer/servicenow-nodejs` 2.1.1 — [MCP Registry API](https://registry.modelcontextprotocol.io/v0/servers?search=servicenow&limit=50)
- **Auth (per instance):**
  - Basic.
  - OAuth 2.0 Client Credentials.
  - OAuth Password grant (ROPC).
  - Per-user Authorization Code + PKCE.
  - Credentials are stored in the OS keychain.
  - Source: [GitHub repo](https://github.com/Happy-Technologies-LLC/mcp-servicenow-nodejs)
- **Transports:** stdio and HTTP/SSE. HTTP/SSE requires the bearer token `HAPPY_MCP_API_TOKEN` — [GitHub repo](https://github.com/Happy-Technologies-LLC/mcp-servicenow-nodejs)
- **Read-only:** no read-only mode described; ServiceNow ACLs govern access. `HAPPY_MCP_DOCS_ONLY=true` runs without credentials — [GitHub repo](https://github.com/Happy-Technologies-LLC/mcp-servicenow-nodejs)
- **Tools and instances:** 60 tools, schema for 94 core tables, multi-instance with a per-call `instance` parameter — [GitHub repo](https://github.com/Happy-Technologies-LLC/mcp-servicenow-nodejs)

#### 6. michaelbuckner/servicenow-mcp (Python, MIT) — community (individual)
- **URL:** https://github.com/michaelbuckner/servicenow-mcp
- **Stats:** 47 stars, 26 forks, only 4 commits, no releases — [GitHub repo](https://github.com/michaelbuckner/servicenow-mcp)
- **Auth:** basic, OAuth token, and OAuth (client ID/secret plus username/password, i.e. password grant) — [GitHub repo](https://github.com/michaelbuckner/servicenow-mcp)
- **Tools:** incident CRUD, search, natural-language search/update and `update_script` — [GitHub repo](https://github.com/michaelbuckner/servicenow-mcp)
- **Read-only:** none mentioned — [GitHub repo](https://github.com/michaelbuckner/servicenow-mcp)

#### 7. Other entries (less detail verified)
- `mfa-servicenow-mcp` (PyPI) is very actively released: 1.25.55 uploaded 2026-11-23. Its description mentions "read-only defaults, write guards, dry-run previews", and the author says it was built primarily for their own workflows — [PyPI JSON API](https://pypi.org/pypi/mfa-servicenow-mcp/json); [PyPI 1.22.1](https://pypi.org/project/mfa-servicenow-mcp/1.22.1/)
- `@aartiq/servicenow-mcp` (npm 1.0.2, 2026-03-01) gates writes behind environment flags; it is not read-only by default — [npm registry](https://registry.npmjs.org/@aartiq/servicenow-mcp); [Socket.dev](https://socket.dev/npm/package/@aartiq/servicenow-mcp)
- `natejums/servicenow-mcp` is a read-only-by-design Python server with no write tools — [Glama listing (summary via search)](https://glama.ai/mcp/servers/vour1b0lur)
- Other MCP registry entries:
  - `io.github.onlyflowstech/servicenow-mcp` 2.3.0
  - `io.github.asklokesh/servicenow-mcp-server` 0.1.1
  - `io.github.mindstone/mcp-server-servicenow` 0.3.1 (in the mindstone/mcp-servers monorepo)
  - `do.sysproperties/servicenow-properties` 1.1.0 (hosted remote on supabase.co)
  - Source: [MCP Registry API](https://registry.modelcontextprotocol.io/v0/servers?search=servicenow&limit=50)
- PyPI `servicenow-mcp` is at 0.1.1 (uploaded 2025-08-03) with no project URLs, so it is not clearly tied to echelon-ai-labs — [PyPI JSON API](https://pypi.org/pypi/servicenow-mcp/json)
- **Commercial gateways (not servers you self-run):** CData offers a ServiceNow MCP and Arcade documents governance of ServiceNow remote MCP servers — [CData guide](https://www.cdata.com/blog/servicenow-mcp-guide-2026); [Arcade docs](https://docs.arcade.dev/operate/governance/remote-mcp-servers/servicenow)

### Inferences
- **Popularity vs. maintenance:** these are inversely related. echelon-ai-labs has by far the most stars and forks (the forks probably reflect people patching it themselves, given 19 open PRs), but it appears unmaintained since October 2025. Newer servers ship releases monthly or faster but have small star counts (4 to 56).
- **Read-only:**
  - Strongest: IvanBBaev/servicenow-mcp-ai (global read-only, per-package read-only, plan mode, table allow/deny), Xerrion/servicenow-platform-mcp (read-only by default, prod guard) and jschuller (`--read-only`, enforced at the HTTP-method level).
  - echelon's role packages (e.g. `service_desk`) narrow scope but all include write tools.
  - For any server, a read-only ServiceNow integration user (ACL/role-limited) is the platform-level backstop.
- **Auth breadth:** IvanBBaev is the only community server found that documents mTLS. Client credentials are supported by jschuller, IvanBBaev, Happy Platform and (likely) echelon's `oauth` mode. Password grant is supported by Happy Platform, IvanBBaev (deprecated) and michaelbuckner.

### Gaps
- Exact star counts and last-commit dates for most repos could not be pulled through the GitHub API (access blocked). Stats come from rendered pages, and last-commit dates were verified only for echelon-ai-labs.
- Whether echelon's `oauth` mode uses client credentials or password grant was not confirmed from the README excerpt.
- The mfa-servicenow-mcp GitHub repo, maintainer and stars were not identified.
- Stars and activity for onlyflowstech, asklokesh and mindstone were not checked.

## Which ones work with self-hosted / on-prem ServiceNow instances?

### Takeaway
No source explicitly addresses self-hosted (customer-hosted) ServiceNow for either the official or community servers. Community servers take an arbitrary instance base URL and use the standard REST/Table API, so they should work against any reachable instance with REST and the chosen auth enabled. This is an inference, not documented.

### Cited Findings
- The official MCP Server Console is hosted on the instance itself (`/sncapps/mcp-server/...`) and is not available in GCC "at this time" — [developersdigest directory](https://www.developersdigest.tech/mcp-servers/servicenow-mcp-server-console); [Enable MCP and A2A FAQ](https://www.servicenow.com/community/servicenow-otto-articles/enable-mcp-and-a2a-for-your-agentic-workflows-with-faqs-updated/ta-p/3373907)
- IvanBBaev/servicenow-mcp-ai allows only `*.service-now.com` hosts by default. Custom or sovereign-cloud domains must be added via `SN_ALLOWED_HOSTS` — [GitHub repo](https://github.com/IvanBBaev/servicenow-mcp-ai)
- echelon-ai-labs uses a free-form `SERVICENOW_INSTANCE_URL` — [GitHub repo](https://github.com/echelon-ai-labs/servicenow-mcp)
- jschuller says it works on "any release from Tokyo up" for PDIs and company instances — [GitHub repo](https://github.com/jschuller/mcp-server-servicenow)
- Xerrion's examples use only `service-now.com` URLs — [GitHub repo](https://github.com/Xerrion/servicenow-platform-mcp)
- Happy Platform supports multiple instances with per-instance auth in a registry file — [GitHub repo](https://github.com/Happy-Technologies-LLC/mcp-servicenow-nodejs)

### Inferences
- For self-hosted instances on custom domains: IvanBBaev (with `SN_ALLOWED_HOSTS`, plus mTLS for locked-down networks), echelon and Happy Platform (arbitrary URL, basic/OAuth) are the most plausible fits. The official MCP Server Console depends on a Store app plus Now Assist/Generative AI Controller, which in turn depend on ServiceNow-hosted AI services. Its availability on self-hosted deployments is doubtful and must be confirmed with ServiceNow.
- Xerrion's OAuth-PKCE-only, `useraccount`-scope design needs a recent instance release that supports that OAuth configuration.

### Gaps
- No ServiceNow documentation was found on MCP Server Console for self-hosted/on-prem deployments.
- No community README was found that explicitly tests against a self-hosted instance.
