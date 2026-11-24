# MCP Servers for Grafana (state as of November 2026)

Research date: 2026-11-24. Method notes: GitHub API access was unavailable in this session, so repo stats come from fetching the GitHub web pages and third-party trackers on that date. The GitHub releases page shows dates without a year (for example "10 Nov"). The fetch tool reported that the asset timestamps were 2026, and this matches the official MCP registry timeline (v0.17.2 published in July 2026, then v1.x and v2.x releases from late September onward).

## What is Grafana Labs' official MCP server (grafana/mcp-grafana): current version, read-only flag, tool categories, auth options, and self-hosted support?

### Takeaway
`grafana/mcp-grafana` is Grafana Labs' official MCP server. It is written in Go, licensed Apache-2.0, has about 3.7k stars, and is very actively maintained. The latest release found is v2.3.0 (10 Nov 2026). It runs over stdio, SSE and streamable HTTP, and works with both self-hosted Grafana (9.0 or later) and Grafana Cloud. `--disable-write` gives a read-only mode, with per-tool re-enable and per-category disable flags. Auth options are a service account token (inline or from a file), basic auth, deprecated API keys, client mTLS, per-request `X-Grafana-*` headers, and a bearer token that protects the MCP endpoint itself.

### Cited Findings
**Repository and maintenance**
- Repo: https://github.com/grafana/mcp-grafana. It is maintained by Grafana Labs (official), licensed Apache 2.0, and is a Go module. On 2026-11-24 the repo page showed about 3.7k stars, 503 forks and 1,069 commits — [GitHub repo](https://github.com/grafana/mcp-grafana)
- A third-party tracker recorded the stars rising from 3,621 to 3,675 between 28 Oct and 17 Nov 2026, with 502 forks — [Enterprise DNA directory](https://enterprisedna.co/directories/mcp/grafana-mcp-grafana) (cited via search snippet). LobeHub shows a lower 1.8k, which is probably a stale snapshot — [LobeHub](https://lobehub.com/mcp/grafana-mcp-grafana)
- Recent releases (dates in 2026) — [GitHub releases](https://github.com/grafana/mcp-grafana/releases):
  - **v2.3.0 (10 Nov)**: Adds Elasticsearch support to `run_panel_query` and an opt-in check that flags unscoped Prometheus queries. Exposes active IRM incidents as MCP resources. Breaking: alerting write tools now accept only create, update and delete.
  - **v2.2.0 (02 Nov)**: Adds CloudWatch Logs Insights tools and exposes datasources as MCP resources. Most datasource queries now go through Grafana's `/api/ds/query` endpoint. Breaking: Grafana versions before 9.0 are no longer supported for these queries.
  - **v2.1.1 / v2.1.0 (20 Oct)**: Alerting tools can create datasource-managed Mimir/Cortex/Loki rules. `query_prometheus` renders interactive charts in MCP Apps hosts.
  - **v2.0.2 (07 Oct), v2.0.1 (06 Oct)**: Bug fixes.
  - **v2.0.0 (01 Oct)**: Switches to the official MCP Go SDK and changes the module path to `/v2`. Removes the Sift tools and splits alerting into read and write tools. Over SSE, per-request headers no longer reach tool calls.
  - **v1.6.3 (30 Sep)**: Outbound clients refuse cross-host redirects to protect credentials.
- Before that, the official MCP registry lists `io.github.grafana/mcp-grafana` versions 0.10.0 (2026-02-12) through 0.17.2 (2026-07-13). The release cadence is roughly weekly to biweekly — [MCP Registry API](https://registry.modelcontextprotocol.io/v0/servers?search=grafana)
- Distribution: Docker image `grafana/mcp-grafana`, a binary, and a `grafana-mcp` Helm chart in grafana/helm-charts — [GitHub README](https://github.com/grafana/mcp-grafana). Registry entries list an OCI (docker.io) stdio package — [MCP Registry](https://registry.modelcontextprotocol.io/v0/servers?search=grafana). A PyPI package `mcp-grafana` also exists, at version 0.17.x or later per search results, but the PyPI page would not load, so its maintainer and date are unverified — [PyPI](https://pypi.org/project/mcp-grafana/0.17.1/)

**Transports**
- stdio (the default), SSE and streamable-http — [GitHub README](https://github.com/grafana/mcp-grafana)
- In streamable-http mode only, the MCP server can serve HTTPS itself via `--server.tls-cert-file` and `--server.tls-key-file` — [GitHub README](https://github.com/grafana/mcp-grafana)

**Read-only mode and tool gating**
- `--disable-write` turns off all write tools. These include dashboard updates and folder creation, incident create/update, alert rule, silence and contact-point writes, annotation and snapshot create/update/delete, notebook writes, and deeplink URL shortening. It also turns off the raw-SQL tools `query_sql` and `query_influxdb` unless `--enable-query` is set — [GitHub README](https://github.com/grafana/mcp-grafana)
- `--enable-write-tools=<name>` re-enables individual write tools while in read-only mode — [GitHub README](https://github.com/grafana/mcp-grafana)
- `--disable-<category>` flags exist per category: search, datasource, incident, prometheus, write, query, loki, elasticsearch, quickwit, influxdb, alerting, dashboard, folder, notebooks, oncall, asserts, admin, pyroscope, navigation, tempo (alias `--disable-proxied`), annotations, rendering, snapshot, cloudwatch, xray, cloudlogging, azuremonitor, examples, sql, runpanelquery, graphite, dsquery, plugin, api, config, provisioning, agento11y, assistant, docs and user — [GitHub README](https://github.com/grafana/mcp-grafana)
- `--enabled-tools` is a comma-separated list of categories to turn on. These are off by default: admin, agento11y, assistant, athena, azuremonitor, clickhouse, cloudlogging, cloudwatch, dsquery, elasticsearch, examples, graphite, quickwit, runpanelquery, snowflake and xray — [GitHub README](https://github.com/grafana/mcp-grafana)
- Source conflict: one directory claims the server is limited to read operations only, with no dashboard creation or alert management — [Enterprise DNA](https://enterprisedna.co/directories/mcp/grafana-mcp-grafana). The official README contradicts this, since it lists write tools that `--disable-write` turns off — [GitHub README](https://github.com/grafana/mcp-grafana)

**Tool categories**
- The README lists these categories: Admin, User, Search, Dashboard, Notebook, RunPanelQuery, Datasources, Examples, Prometheus, Loki, InfluxDB, SQL (ClickHouse, Snowflake, Athena), CloudWatch, X-Ray, Cloud Logging, Azure Monitor, Graphite, Elasticsearch/OpenSearch, Quickwit, Agent Observability, Assistant, Incident, Alerting, OnCall, Pyroscope, Asserts, Annotations, Snapshot, Rendering, Provisioning, Docs, Tempo (proxied), Plugins, Navigation, Config and API — [GitHub README](https://github.com/grafana/mcp-grafana)
- Loki tools include `query_loki_logs`, `query_loki_patterns` and `query_loki_stats`. Prometheus tools include `query_prometheus` — [PyPI listing summary via search](https://pypi.org/project/mcp-grafana/0.17.1/)

**Auth**
- Service account token: `GRAFANA_SERVICE_ACCOUNT_TOKEN`, or `GRAFANA_SERVICE_ACCOUNT_TOKEN_FILE`. The file is re-read on each request, so rotated tokens load without a restart, and an inline token takes precedence if both are set — [GitHub README](https://github.com/grafana/mcp-grafana)
- API keys: `GRAFANA_API_KEY` and the `X-Grafana-API-Key` header are deprecated but still work — [GitHub README](https://github.com/grafana/mcp-grafana)
- Basic auth: `GRAFANA_USERNAME` and `GRAFANA_PASSWORD` — [GitHub README](https://github.com/grafana/mcp-grafana)
- Client mTLS and TLS to Grafana: `--tls-cert-file` and `--tls-key-file` for client certificates, `--tls-ca-file` for a custom CA, and `--tls-skip-verify` (insecure, for testing only) — [GitHub README](https://github.com/grafana/mcp-grafana)
- Per-request headers in HTTP modes: `X-Grafana-Service-Account-Token`, `X-Grafana-API-Key`, `X-Grafana-Org-Id`, and `X-Grafana-URL` (which requires `--allow-grafana-url-override`). Since v2.0.0, per-request headers no longer reach tool calls over SSE — [GitHub README](https://github.com/grafana/mcp-grafana); [Releases](https://github.com/grafana/mcp-grafana/releases)
- Org selection: `GRAFANA_ORG_ID`. With `--dynamic-multi-org`, each tool call can pass an `orgId`, but only for credentials that belong to more than one org, such as a user or on-behalf-of identity. Service account tokens stay bound to one org. On-behalf-of is only mentioned in passing, with no setup steps — [GitHub README](https://github.com/grafana/mcp-grafana)
- `GRAFANA_EXTRA_HEADERS` takes a JSON object of headers that are sent on every Grafana API request (useful behind auth proxies) — [GitHub README](https://github.com/grafana/mcp-grafana)
- Protecting the MCP endpoint itself: `MCP_GRAFANA_SERVER_TOKEN` requires clients to send an `Authorization: Bearer` token, and `MCP_GRAFANA_SERVER_AUTH_HEADER` reads the token from a different header — [GitHub README](https://github.com/grafana/mcp-grafana)
- Grafana's comparison page says the OSS server authenticates with a username/password or a service account token and is scoped to that service account — [Grafana Cloud docs](https://grafana.com/docs/grafana-cloud/ai-tools/mcp-servers/cloud-mcp/)

**Self-hosted support**
- It works with self-hosted Grafana (the README has a localhost example) and with Grafana Cloud. Full functionality requires Grafana 9.0 or later — [GitHub README](https://github.com/grafana/mcp-grafana); [Grafana Cloud docs comparison](https://grafana.com/docs/grafana-cloud/ai-tools/mcp-servers/cloud-mcp/)
- Grafana also documents the OSS server in the Grafana OSS docs — [Grafana docs guides](https://grafana.com/docs/grafana/latest/ai-tools/mcp/guides/)

### Inferences
- The project went from 0.x (February 2026) to v2.x (October 2026) with frequent breaking changes: the move to the official MCP Go SDK, the split of alerting into read and write tools, and the removal of Sift. Pinning a version is advisable.
- `--disable-write` is not fully "read-only" for data sources if `--enable-query` is also set, because raw SQL can modify data when the datasource credentials allow it.
- The OSS server has no built-in OAuth to Grafana. OAuth and user-scoped access are what the hosted Cloud MCP offers instead.

### Gaps
- The exact year was not printed on the releases page; 2026 is inferred from asset timestamps and the registry timeline.
- The last commit date was not visible, because the GitHub API was blocked. Releases on 10 Nov 2026 suggest commits within the last two weeks.
- The PyPI package metadata could not be loaded.
- There is no detailed documentation of on-behalf-of or OAuth flows for the OSS server.

## Is there a Grafana-hosted/remote MCP offering for Grafana Cloud?

### Takeaway
Yes. The Grafana Cloud MCP server is a managed, remote server at `https://mcp.grafana.com/mcp`. It uses streamable HTTP only and authenticates with OAuth 2.1, user-scoped through Grafana RBAC. At OAuth consent the user picks Read, Query and Write scopes, which gives a read-only mode. It works only with hosted Grafana Cloud stacks and is billed as part of Grafana Assistant. Its release stage is reported inconsistently: the docs say public preview, while a "What's new" entry dated 2026-07-28 says generally available. Separately, Tempo (OSS and Cloud) has a built-in MCP endpoint.

### Cited Findings
- **Endpoint**: `https://mcp.grafana.com/mcp`. The stack is selected with an `X-Grafana-URL` header or in the path (`https://mcp.grafana.com/mcp/<stack>.grafana.net`) — [Grafana Cloud MCP docs](https://grafana.com/docs/grafana-cloud/ai-tools/mcp-servers/cloud-mcp/)
- **Transport**: streamable HTTP only; SSE is not supported — [Grafana Cloud MCP docs](https://grafana.com/docs/grafana-cloud/ai-tools/mcp-servers/cloud-mcp/)
- **Auth**: an OAuth 2.1 browser flow. Access is user-scoped, so the agent gets only the user's Grafana RBAC permissions, and no service account token is needed. Custom clients may need a registered OAuth client. The token lasts 1 hour and refreshes for up to 30 days, after which the user must re-authorize — [Grafana Cloud MCP docs](https://grafana.com/docs/grafana-cloud/ai-tools/mcp-servers/cloud-mcp/)
- **Required permission**: the "Assistant Cloud MCP User" role or `grafana-assistant-app.cloud-mcp:access`. Editors and above have it by default. Grafana Assistant must be available for the stack, with its terms accepted — [Grafana Cloud MCP docs](https://grafana.com/docs/grafana-cloud/ai-tools/mcp-servers/cloud-mcp/)
- **Read-only mode**: at consent the user sees separate Read, Query and Write checkboxes. Read covers viewing dashboards, alerts, incidents, metrics, logs, traces and profiles. Query covers raw SQL against ClickHouse, Snowflake, Athena and InfluxDB (`query_athena`, `query_clickhouse`, `query_influxdb`, `query_snowflake`), which can modify data if the credentials allow. Write covers tools such as `update_dashboard`, `create_folder`, `create_annotation`, `create_incident`, `create_investigation`, `ask_assistant` and alert rule writes. For a truly read-only session, clear both Write and Query — [Grafana Cloud MCP docs](https://grafana.com/docs/grafana-cloud/ai-tools/mcp-servers/cloud-mcp/)
- **Billing**: it is part of Grafana Assistant, and each MCP user counts as an active user. Assistant tokens are consumed only when a tool invokes an Assistant model; read-only use consumes none — [Grafana Cloud MCP docs](https://grafana.com/docs/grafana-cloud/ai-tools/mcp-servers/cloud-mcp/)
- **Limitations**: Grafana Cloud only; self-hosted Grafana is not supported — [Grafana Cloud MCP docs](https://grafana.com/docs/grafana-cloud/ai-tools/mcp-servers/cloud-mcp/)
- The official MCP registry lists `https://mcp.grafana.com/mcp` as a streamable-http remote, requiring an `X-Grafana-URL` header, under `io.github.grafana/mcp-grafana` from v0.14.0 (2026-05-08). This suggests the hosted service is built on the same codebase — [MCP Registry](https://registry.modelcontextprotocol.io/v0/servers?search=grafana)
- **Announcement**: a "What's new" entry, whose URL slug is dated 2026-07-28, describes the server as "fully managed by Grafana Labs" with "user-scoped, secure access" and names Cursor, Claude Desktop and custom agents as clients — [Grafana What's new](https://grafana.com/whats-new/2026-07-28-cloud-mcp-server--connect-your-agents-to-grafana-cloud-with-a-single-url/)
- **Release stage conflict**: the docs call it public preview, while the What's new listing calls it Generally Available. This is per search-result summaries; the pages I fetched did not state a stage — [Grafana Cloud MCP docs](https://grafana.com/docs/grafana-cloud/ai-tools/mcp-servers/cloud-mcp/); [What's new](https://grafana.com/whats-new/2026-07-28-cloud-mcp-server--connect-your-agents-to-grafana-cloud-with-a-single-url/)
- **Marketplace listings**: there is a Claude connector page — [Claude connectors](https://claude.com/connectors/grafana-cloud) — and a Cursor marketplace listing by grafana-labs — [Cursor marketplace](https://cursor.com/marketplace/grafana-labs/grafana-cloud-mcp)
- **Tempo built-in MCP server** (official, part of Tempo):
  - Enable it with `query_frontend.mcp_server.enabled: true` or `--query-frontend.mcp-server.enabled=true` (disabled by default). The endpoint is `/api/mcp` over streamable HTTP, and it uses Tempo's normal API auth and multi-tenancy.
  - Tools: `traceql-search`, `traceql-metrics-instant`, `traceql-metrics-range`, `get-trace`, `traces-diff` (experimental), `get-attribute-names`, `get-attribute-values`, `docs-traceql` and `docs-config`. These are query and retrieve tools only.
  - Source — [Tempo MCP docs](https://grafana.com/docs/tempo/latest/api_docs/mcp-server/)
- **Grafana Cloud Traces** exposes the same Tempo MCP at the stack's `/tempo/api/mcp` URL with basic auth, in public preview — [Grafana Cloud Traces MCP](https://grafana.com/docs/grafana-cloud/send-data/traces/mcp-server/) (via search summary)

### Inferences
- Self-hosted users choose between the OSS `mcp-grafana` and the built-in Tempo MCP. Cloud users can use either of those or the OAuth-based hosted endpoint, which avoids handing out service account tokens.

### Gaps
- I could not confirm the authoritative GA versus preview status as of November 2026.
- No per-region endpoints or data residency details were found.
- I could not confirm which Tempo version first shipped the MCP server. Docs exist for v2.10.x, which is marked outdated, and for v3.0.x.

## What community Grafana MCP servers exist and are they maintained?

### Takeaway
The community field is thin. The official server dominates, and directories mostly re-list `grafana/mcp-grafana`. The notable alternatives are small:
- `dockndevai/mcp-grafana` (npm, stdio): read-only by default through `GRAFANA_MODE`, actively released through 23 Nov 2026, but only about 1 star.
- `DrDroidLab/grafana-mcp-server`: 6 stars, no releases, no read-only mode.
- `lukleh` `mcp-read-only-grafana` (PyPI): read-only by design, with a separate write command; activity unverified.
- `mcparmory/grafana`: a registry-generated wrapper.

The earlier Loki MCP prototype under Grafana (`grafana/loki-mcp`) is now archived (26 Oct 2026).

### Cited Findings
- **dockndevai/mcp-grafana**:
  - Repo: https://github.com/dockndevai/mcp-grafana, published on npm as `@dockndevai/mcp-grafana`. Community-maintained, about 1 star, 24 commits — [GitHub](https://github.com/dockndevai/mcp-grafana)
  - Read-only: `GRAFANA_MODE` defaults to `read-only`. The other modes are `read-write` (adds create/update of dashboards, folders and annotations) and `admin` (adds deletes, which also require `GRAFANA_ALLOW_DELETE`) — [GitHub](https://github.com/dockndevai/mcp-grafana)
  - Auth: a service account token via `GRAFANA_TOKEN` — [GitHub](https://github.com/dockndevai/mcp-grafana)
  - Transport: stdio — [MCP Registry](https://registry.modelcontextprotocol.io/v0/servers?search=grafana)
  - Registry versions run from 0.1.0 (2026-09-03) to 0.4.1 (2026-11-23), so it is actively released — [MCP Registry](https://registry.modelcontextprotocol.io/v0/servers?search=grafana)
- **DrDroidLab/grafana-mcp-server**:
  - Repo: https://github.com/drdroidlab/grafana-mcp-server, maintained by the DrDroid company (community). 6 stars, 46 commits, no releases published — [GitHub](https://github.com/drdroidlab/grafana-mcp-server)
  - Transports: HTTP/SSE on port 8000 with an `/mcp` endpoint, or stdio via Docker with `-t stdio` — [GitHub](https://github.com/drdroidlab/grafana-mcp-server)
  - Auth: a service account token (`glsa_`) via `GRAFANA_API_KEY`, with a Viewer role recommended. There is no read-only flag — [GitHub](https://github.com/drdroidlab/grafana-mcp-server)
  - Tools (10): `test_connection`, PromQL, Loki, dashboards, panels, label values, variables, datasources and folders — [GitHub](https://github.com/drdroidlab/grafana-mcp-server)
- **mcp-read-only-grafana (lukleh)**: a PyPI package that is read-only by default, with a separate write-capable command, `mcp-grafana-write`. Versions 0.1.2, 0.1.5 and 0.2.0 exist — [PyPI](https://pypi.org/project/mcp-read-only-grafana) (via search summary; the page would not render)
- **com.mcparmory/grafana**: a generated wrapper from the `mcparmory/registry` repo (https://github.com/mcparmory/registry). It is stdio, distributed through PyPI/uvx and ghcr.io. Versions 1.0.2 (2026-05-05) and 1.0.3 (2026-05-12) — [MCP Registry](https://registry.modelcontextprotocol.io/v0/servers?search=grafana)
- **ai.getvda/postgres-grafana-stack-generator**: a remote streamable-http server at postgres-grafana-stack-generator.getvda.ai/mcp. It generates Postgres plus Grafana stacks and does not operate on an existing Grafana. Version 1.0.0 (2026-09-03) — [MCP Registry](https://registry.modelcontextprotocol.io/v0/servers?search=grafana)
- **grafana/loki-mcp**:
  - It now redirects to grafana-cold-storage/loki-mcp, with the CI badge pointing to scottlepp/loki-mcp. 176 stars, 43 forks. Archived on Oct 26, 2026 — [GitHub](https://github.com/grafana/loki-mcp)
  - It had a single `loki_query` tool over stdio or SSE/HTTP (`/sse`, `/mcp`) — [GitHub](https://github.com/grafana/loki-mcp)
  - Auth: `LOKI_USERNAME`/`LOKI_PASSWORD`, `LOKI_TOKEN` (bearer), and `LOKI_ORG_ID`, sent as `X-Scope-OrgID` — [GitHub](https://github.com/grafana/loki-mcp)
- Search results and directories (LobeHub, mcpservers.org, Augment) mostly list the official `grafana/mcp-grafana` rather than distinct community servers — [mcpservers.org](https://mcpservers.org/servers/grafana/mcp-grafana); [LobeHub](https://lobehub.com/mcp/grafana-mcp-grafana)
- Other packagings of the official server include the Stacklok ToolHive guide — [Stacklok docs](https://docs.stacklok.com/toolhive/guides-mcp/grafana)
- Microsoft announced Azure Managed Grafana MCP, a managed offering for Azure Managed Grafana — [Microsoft Tech Community](https://techcommunity.microsoft.com/t5/azure-observability-blog/introducing-azure-managed-grafana-mcp-the-managed-telemetry/ba-p/4503619) (title only; not fetched)

### Inferences
- For Grafana, "community" servers are mostly niche or low-adoption. The official server's breadth (35+ categories), its activity, and its read-only flag leave little room for alternatives. Choose a community server only for a specific need, such as stricter read-only defaults (dockndevai, lukleh).
- With `grafana/loki-mcp` archived, Loki access is consolidated into the `mcp-grafana` Loki tools.

### Gaps
- I could not get star counts or last-commit dates for lukleh/mcp-read-only-grafana or mcparmory, or a commit date for DrDroidLab, because the GitHub API was blocked and PyPI did not render.
- The registry query was paginated (`nextCursor` present), so later official versions (v1.x and v2.x) and further community entries were not seen on the first page.
- I did not check the `modelcontextprotocol/servers` README list or Docker Hub pull counts.
- I did not fetch the details of the Azure Managed Grafana MCP (auth and read-only behaviour).
