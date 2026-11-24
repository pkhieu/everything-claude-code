# MCP Servers for Jira and Confluence Data Center / Server (self-hosted), as of 24 Nov 2026

## Does Atlassian's official MCP offering (Atlassian Remote MCP / Rovo MCP) support Data Center, or only Cloud? Is there an official Data Center MCP?

### Takeaway
The Atlassian Rovo MCP Server (remote MCP) works only with Atlassian Cloud. As of Nov 2026 Atlassian has no official MCP server for Jira DC or Confluence DC. The Jira DC feature request is still at "Gathering Interest". The one official Data Center MCP that Atlassian does ship is for Bitbucket DC: "MCP for Bitbucket Data Center", a Marketplace plugin whose v1.0.2 is dated 28 Sep 2026.

### Cited Findings
**Rovo MCP Server (Cloud only)**
- The official repo atlassian/atlassian-mcp-server calls itself a "cloud-based bridge between your Atlassian Cloud site" and AI tools. Its hosting badge reads "Atlassian Cloud" and it never mentions Data Center or Server. Products covered: Jira, Confluence, JSM, Bitbucket Cloud, Compass, Loom, plus platform data (Goals, Projects, Teams, Teamwork Graph). — [GitHub atlassian/atlassian-mcp-server](https://github.com/atlassian/atlassian-mcp-server)
- Rovo MCP auth:
  - OAuth 2.1 for most products. Compass accepts OAuth only.
  - API tokens for most products. JSM accepts API tokens only, and an org admin must enable API-token auth.
  - Personal tokens are sent as Basic auth; service-account keys are sent as Bearer.
  — [GitHub atlassian/atlassian-mcp-server](https://github.com/atlassian/atlassian-mcp-server)
- Rovo MCP endpoints and transport:
  - Recommended endpoint: `https://mcp.atlassian.com/v2/mcp`.
  - Legacy v1 endpoints: `/v1/mcp` and `/v1/mcp/authv2`.
  - The `/v1/sse` endpoint is deprecated and unsupported after 30 June 2026.
  - Transport is remote HTTP. Local stdio-only clients can bridge through `mcp-remote` (Node 18+).
  — [GitHub atlassian/atlassian-mcp-server](https://github.com/atlassian/atlassian-mcp-server)
- Repo stats when fetched (24 Nov 2026): about 1.2k stars, 156 forks, 146 commits, Apache-2.0 license, no GitHub releases. — [GitHub atlassian/atlassian-mcp-server](https://github.com/atlassian/atlassian-mcp-server)
- Recent Rovo MCP changelog entries, none of which mention Data Center or Server:

  | Date | Change |
  |---|---|
  | 12 Nov 2026 | Service accounts can authenticate with OAuth 2.0 client credentials; access tokens last 60 minutes and are sent as Bearer to `/v2/mcp` |
  | 12 Nov 2026 | The Atlassian Guard external-sites policy now applies to MCP connections |
  | 3 Nov 2026 | Claude-issued Managed Auth (EMA/XAA) is supported |
  | 2 Nov 2026 | Jira Align toolsets `read_jira_align` and `write_jira_align` added |
  | 20 Oct 2026 | Twelve JSM tools added on V2 |

  — [Rovo MCP changelog](https://developer.atlassian.com/cloud/rovo-mcp/changelog/)
- Atlassian Community answers say the Remote MCP Server does not support Jira Server or Data Center. — [Atlassian Community Q&A](https://community.atlassian.com/forums/Jira-questions/Does-the-new-Atlassian-Remote-MCP-Server-support-Server-Data/qaq-p/3112877); [Atlassian Community Q&A 2](https://community.atlassian.com/forums/Rovo-questions/Does-the-new-MCP-Server-support-Data-Based-Jira-or-only-Cloud/qaq-p/3060878)
- Some third-party guides also call the official server "Cloud only" and say no DC timeline has been published. Treat these as secondary sources. — [usecarly.com](https://www.usecarly.com/blog/jira-mcp/); [mcp.directory guide](https://mcp.directory/blog/jira-mcp-complete-guide-2026)
- Release dates for the official server disagree across third-party blogs:
  - One cites GA on 4 Feb 2026.
  - Walma says "version 2 ... generally available on 8 September 2026".
  - I did not verify either date against an Atlassian primary source.
  — [walma.ai](https://walma.ai/en/guides/mcp/atlassian-mcp)

**Jira DC request JRASERVER-78874 ("Jira Data Center MCP Server")**
- Status is "Gathering Interest". It was created 11 Jun 2025.
- When fetched in Nov 2026 it had 110 votes and 90 watchers.
- It has no Atlassian comments, is unassigned, and is linked to ENT-3240 ("is addressed by"). ENT-3240 did not load.
— [JRASERVER-78874](https://jira.atlassian.com/browse/JRASERVER-78874)

**Confluence DC request CONFSERVER-101161**
- A matching Confluence DC suggestion exists. I found it in search results only and did not fetch it, so its status is unverified. — [CONFSERVER-101161](https://jira.atlassian.com/browse/CONFSERVER-101161)

**Official Bitbucket DC MCP (Atlassian-built, but Bitbucket only)**
- Marketplace app key: `com.atlassian.dc.mcp.atlassian-dc-mcp-server-bitbucket-plugin`. Its summary reads: "The official MCP server for Bitbucket DC." — [Marketplace REST](https://marketplace.atlassian.com/rest/2/addons/com.atlassian.dc.mcp.atlassian-dc-mcp-server-bitbucket-plugin)
- Latest version is 1.0.2, released 28 Sep 2026 as a bugfix update.
- The app is free and "Partner Supported", with 188 installs.
- The listing says it works with Bitbucket DC 9.0.0–9.6.5.
- Tools cover projects/repos, branches/tags, commits/files, pull requests, and `edit_file`.
— [Marketplace listing](https://marketplace.atlassian.com/apps/729551276/mcp-for-bitbucket-data-center?tab=overview)
- The release announcement says it supports Bitbucket 9.x and 10.x. — [Atlassian dev community announcement](https://community.developer.atlassian.com/t/mcp-for-bitbucket-dc-has-been-released/102963)
- How the Bitbucket DC MCP controls tool access (it has no explicit read-only flag):
  - Admins set a tool whitelist with `BITBUCKET_HOME/shared/mcp-tools.json`, which replaces the default whitelist entirely.
  - Tools are also filtered by the caller's token permissions: REPO_READ/CREATE/ADMIN and PROJECT_READ/CREATE/ADMIN.
  - Atlassian recommends enabling rate limiting.
  - The docs do not state the auth method, endpoint or transport.
  — [Bitbucket DC docs: MCP Server for Bitbucket](https://confluence.atlassian.com/bitbucketserver/mcp-server-for-bitbucket-1822723944.html)

### Inferences
- Since Atlassian has shipped an official DC MCP for Bitbucket, an equivalent for Jira or Confluence DC is plausible. ENT-3240 may be the tracking item, but I found no public commitment as of 24 Nov 2026.
- The Bitbucket plugin's design (runs inside the DC instance, admin whitelist, token-scoped tools) is a likely template for any future Jira/Confluence DC version. This is speculation.

### Gaps
- I could not load the contents of ENT-3240.
- The status and vote count of CONFSERVER-101161 are unverified.
- The auth method and transport of the Bitbucket DC MCP are not documented on the pages I fetched.

## What community servers support Jira/Confluence Data Center, and what are their read-only flags, tool filters, auth and transports?

### Takeaway
sooperset/mcp-atlassian is the leading community server for DC. It is very active (v0.24.8 on 23 Nov 2026, about 6.1k stars) and has the fullest DC feature set:
- PAT, basic auth, DC OAuth via Application Links, and BYOT
- `READ_ONLY_MODE`, plus `ENABLED_TOOLS` and `TOOLSETS` filters
- SSL-verify toggles, system trust store, mTLS client certs, and proxies
- stdio, SSE and streamable-http transports

b1ff/atlassian-dc-mcp is a smaller, DC-only Node option covering Jira, Confluence and Bitbucket. It uses PATs and was last published 1 Nov 2026. Its README does not document a read-only mode.

### Cited Findings
**sooperset/mcp-atlassian (community; Python; MIT; "Not an official Atlassian product")**
- Repo: https://github.com/sooperset/mcp-atlassian. Maintainer: GitHub user/org "sooperset". About 6.1k stars when fetched in Nov 2026; the README reports 98 tools in total. — [GitHub](https://github.com/sooperset/mcp-atlassian)
- Supported DC/Server versions: Jira Server/DC 8.14+ and Confluence Server/DC 6.0+. Cloud is also supported. — [GitHub](https://github.com/sooperset/mcp-atlassian); [PyPI](https://pypi.org/project/mcp-atlassian/)
- Recent PyPI releases (latest first):

  | Version | Date |
  |---|---|
  | 0.24.8 | 23 Nov 2026 |
  | 0.24.7 | 20 Nov 2026 |
  | 0.24.6 and 0.24.5 | 16 Nov 2026 |
  | 0.24.4 | 13 Nov 2026 |
  | 0.24.3 and 0.24.2 | 12 Nov 2026 |
  | 0.24.0 and 0.24.1 | 8 Nov 2026 |
  | 0.23.1 | 19 Aug 2026 |
  | 0.23.0 | 18 Jul 2026 |
  | 0.22.0 | 10 Jul 2026 |

  — [PyPI mcp-atlassian](https://pypi.org/project/mcp-atlassian/)
- Read-only mode: `READ_ONLY_MODE=false` by default. Setting it to true "disables all create, update, and delete operations". — [.env.example](https://raw.githubusercontent.com/sooperset/mcp-atlassian/main/.env.example)
- Tool filters:
  - `ENABLED_TOOLS` is a comma-separated allowlist of tool names.
  - `TOOLSETS` is a group-level filter that takes `all` or `default` (core only). Unknown names are ignored; if every name is unknown, no tools are enabled.
  - A tool must pass both filters.
  - Per the comment in .env.example, the default changes to core-only toolsets in v0.22.0.

  — [.env.example](https://raw.githubusercontent.com/sooperset/mcp-atlassian/main/.env.example)
- DC/Server auth:
  - PAT: `JIRA_PERSONAL_TOKEN` and `CONFLUENCE_PERSONAL_TOKEN`.
  - `*_PERSONAL_TOKEN_COMMAND`: a command that fetches the PAT (DC only), with `CREDENTIAL_COMMAND_TIMEOUT=30`.
  - Username/password basic auth.
  - DC OAuth through Application Links: `JIRA_OAUTH_CLIENT_ID/SECRET` and `CONFLUENCE_OAUTH_CLIENT_ID/SECRET`.
  - DC bring-your-own-token: `JIRA_OAUTH_ACCESS_TOKEN` and `CONFLUENCE_OAUTH_ACCESS_TOKEN`.
  - Cloud uses username + API token or OAuth 2.0 3LO via `ATLASSIAN_OAUTH_*`. There is also an MCP OAuth proxy with dynamic client registration (`ATLASSIAN_OAUTH_PROXY_ENABLE`).

  — [.env.example](https://raw.githubusercontent.com/sooperset/mcp-atlassian/main/.env.example)
- TLS and network options:
  - `JIRA_SSL_VERIFY` and `CONFLUENCE_SSL_VERIFY` apply to Server/DC URLs only.
  - `MCP_ATLASSIAN_USE_SYSTEM_TRUSTSTORE=true` uses the OS trust store; false switches to the bundled certifi.
  - mTLS client certs: `JIRA_CLIENT_CERT`, `JIRA_CLIENT_KEY`, `JIRA_CLIENT_KEY_PASSWORD`, and the `CONFLUENCE_*` equivalents. An encrypted key is not supported by requests, so it must be decrypted first.
  - Custom and passthrough headers: `JIRA_CUSTOM_HEADERS` and `JIRA_PASSTHROUGH_HEADERS` (e.g. X-SSO-User).
  - Proxies: HTTP, HTTPS, SOCKS, NO_PROXY and WPAD, either global or per service.

  — [.env.example](https://raw.githubusercontent.com/sooperset/mcp-atlassian/main/.env.example)
- Transports:
  - `TRANSPORT` takes stdio (default) or sse. The docs also cover streamable-http and multi-user HTTP.
  - `HOST` and `PORT` configure network transports.
  - Server-side HTTPS uses `MCP_SSL_CERTFILE` and `MCP_SSL_KEYFILE`.
  - It can be installed with `uvx mcp-atlassian` or run in Docker (the repo includes a Dockerfile).

  — [.env.example](https://raw.githubusercontent.com/sooperset/mcp-atlassian/main/.env.example); [GitHub](https://github.com/sooperset/mcp-atlassian); [PyPI](https://pypi.org/project/mcp-atlassian/)

**b1ff/atlassian-dc-mcp (community; TypeScript/Node; MIT)**
- Repo: https://github.com/b1ff/atlassian-dc-mcp. Maintainer: GitHub user "b1ff". The README says it is "community-maintained ... not affiliated with, endorsed by, or supported by Atlassian".
- About 110 stars, 48 forks and 348 commits when fetched in Nov 2026. No GitHub releases are listed.
— [GitHub](https://github.com/b1ff/atlassian-dc-mcp)
- npm packages: `@atlassian-dc-mcp/jira`, `@atlassian-dc-mcp/confluence` and `@atlassian-dc-mcp/bitbucket`. They target Data Center only and need Node 18+. — [GitHub](https://github.com/b1ff/atlassian-dc-mcp)
- npm `@atlassian-dc-mcp/jira`: latest is 0.43.2, published 1 Nov 2026. The package was first created 2 Mar 2025. — [npm registry](https://registry.npmjs.org/@atlassian-dc-mcp/jira)
- Auth and configuration:
  - Personal Access Tokens go in `<PRODUCT>_API_TOKEN`. A `setup` command can store them in macOS Keychain or a home-directory file.
  - Request timeout is set with `ATLASSIAN_DC_MCP_REQUEST_TIMEOUT_MS` (default 30s).
  - The README does not mention basic auth, SSL/CA options, read-only mode or tool filtering.
  - It runs via `npx`; the transport is not stated, but launching it that way implies stdio.
  — [GitHub](https://github.com/b1ff/atlassian-dc-mcp)

**Other mentions (not verified in depth)**
- PyPI has DC-capable forks and variants, including `atlassian-bitbucket-mcp` (Jira, Confluence and Bitbucket with PAT for DC), `mcp-atlassian-with-bitbucket`, `mcp-atlassian-kw`, `gtai-mcp-atlassian` and `gfg-mcp-atlassian`. Most appear to be forks of sooperset. — [PyPI atlassian-bitbucket-mcp](https://pypi.org/project/atlassian-bitbucket-mcp/); [PyPI mcp-atlassian-kw](https://pypi.org/project/mcp-atlassian-kw/); [PyPI gtai-mcp-atlassian](https://pypi.org/project/gtai-mcp-atlassian/)
- Aggregator sites (Glama, mcpmarket, mcp.so) list additional Jira MCP servers. I did not verify their claims about DC support. — [Glama best Jira MCP servers (Nov 2026)](https://glama.ai/mcp/best/jira); [mcpmarket Atlassian Data Center](https://mcpmarket.com/server/atlassian-data-center)

### Inferences
- For on-prem Jira/Confluence DC with read-only enforcement, PAT and corporate CA/mTLS, sooperset/mcp-atlassian is the only server I found that documents all of these. Its release cadence (about 9 releases in November 2026) suggests active maintenance, but also a fast-moving configuration surface. Pin versions.
- `READ_ONLY_MODE` blocks write tools on the MCP side only. Least privilege still depends on the PAT's own Jira/Confluence permissions. This follows from its description; I did not check it in code.

### Gaps
- I could not read GitHub commit dates or star counts through the API because it was blocked in this session. Star counts come from the repo web pages fetched on 24 Nov 2026.
- I did not confirm whether b1ff/atlassian-dc-mcp offers read-only or tool-filtering options in its code.
- I found no entries in the official MCP registry (registry.modelcontextprotocol.io) for these servers; I did not query it.

## Are there Atlassian Marketplace apps that provide an MCP server inside Jira/Confluence Data Center?

### Takeaway
I found none. Searching the Marketplace REST API for DC-hosted apps ("MCP", "MCP server", "model context protocol", "MCP for Jira" and "MCP for Confluence", filtered to Jira and Confluence) returned no MCP-server app for Jira DC or Confluence DC. The only in-product DC MCP app is Atlassian's own "MCP for Bitbucket Data Center".

### Cited Findings
- A Marketplace REST query `text=MCP&hosting=datacenter` returned "MCP for Bitbucket Data Center" (vendor: Atlassian) as its only true MCP-server result. The other hits were unrelated fuzzy matches such as "map" apps. — [Marketplace REST search](https://marketplace.atlassian.com/rest/2/addons?text=MCP&hosting=datacenter&limit=30)
- The same query filtered to `application=jira` or `application=confluence` returned no MCP-server apps. — [Marketplace REST search (Jira)](https://marketplace.atlassian.com/rest/2/addons?text=MCP&hosting=datacenter&application=jira&limit=20); [Marketplace REST search (Confluence)](https://marketplace.atlassian.com/rest/2/addons?text=MCP&hosting=datacenter&application=confluence&limit=20)
- "AI for Jira" by XDevPod is listed for Jira DC. Its summary mentions AI chat and Rovo Agents for "Jira Cloud or Jira D[ata Center]", but it does not say it is an MCP server. — [Marketplace REST search](https://marketplace.atlassian.com/rest/2/addons?text=MCP&hosting=datacenter&limit=30)

### Inferences
- Organisations on Jira/Confluence DC currently need to run an external, self-hosted MCP server, most likely sooperset/mcp-atlassian, that calls the DC REST APIs with a PAT. No in-product Marketplace option exists yet.

### Gaps
- Marketplace text search is fuzzy. A vendor app that does not use "MCP" in its name or summary could have been missed.
- I did not browse the Marketplace web UI.
