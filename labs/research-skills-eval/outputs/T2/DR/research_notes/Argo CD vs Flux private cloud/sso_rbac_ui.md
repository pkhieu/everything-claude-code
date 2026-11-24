# LDAP/AD SSO, RBAC and User Interface Support: Argo CD vs Flux (state as of Nov 2026)

## Does Argo CD support LDAP/AD via bundled Dex? Limitations? How are AD groups mapped to Argo CD RBAC?

### Takeaway
Yes. Argo CD ships a bundled Dex that can federate LDAP/AD, SAML (e.g. ADFS) and OIDC. It can also connect straight to an OIDC IdP such as Keycloak or ADFS-OIDC without Dex. AD groups reach Argo CD as a `groups` claim. Argo CD's own Casbin RBAC (`policy.csv` `g,` lines plus AppProject roles) maps them to roles. The main caveats: Dex is single-replica unless you give it persistent storage, group membership only refreshes at re-login, and Dex-issued sessions cannot be silently refreshed.

### Cited Findings
**Authentication options**
- Argo CD has one built-in `admin` user. Local users are defined in `argocd-cm` with `apiKey` and/or `login` capabilities. Local users "don't provide advanced features such as groups, login history etc." Usernames are capped at 32 characters, and the docs recommend disabling `admin` once other users exist. — [Argo CD User Management](https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/)
- Bundled Dex delegates authentication to external IdPs: "Multiple types of identity providers are supported (OIDC, SAML, LDAP, GitHub, etc...)". The Argo CD page shows only a GitHub example and points to Dex's connector docs for LDAP. — [Argo CD User Management](https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/)
- Argo CD can skip Dex and use an existing OIDC provider via `oidc.config`, with callback `/auth/callback`. Options include `requestedScopes`, `requestedIDTokenClaims`, `allowedAudiences`, `enablePKCEAuthentication`, `rootCA` and `refreshTokenThreshold`. Keycloak appears only as a link to a separate provider guide, and ADFS is not documented on that page. — [Argo CD User Management](https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/)
- `dex.auth.connectorId` (alpha) forces users to a specific Dex connector. — [Argo CD User Management](https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/)

**Dex LDAP connector for AD**
- The LDAP connector "allows email/password based authentication, backed by a LDAP directory." It runs two queries: a user search, then a group search based on the user entry. — [Dex LDAP connector](https://dexidp.io/docs/connectors/ldap/)
- The Dex docs include an Active Directory example. It uses `userPrincipalName` as the username/email attribute, the DN as the ID, and `member` for group matching. The example sets `insecureSkipVerify: true`, which is meant only for exploration. — [Dex LDAP connector](https://dexidp.io/docs/connectors/ldap/)
- Group search uses `baseDN`, `filter`, `userMatchers` (`userAttr`/`groupAttr`) and `nameAttr`. Nested AD groups are supported through `recursionGroupAttr`, with built-in cycle detection. Without it, lookup is single-level. — [Dex LDAP connector](https://dexidp.io/docs/connectors/ldap/)
- Dex binds with the user's plain-text password, so the docs "strongly recommend" TLS (636 over 389). Port-389 setups "are not covered by any compatibility guarantees with future releases." A search that returns multiple entries is treated as ambiguous and errors. — [Dex LDAP connector](https://dexidp.io/docs/connectors/ldap/)

**Limitations**
- **Dex HA:** Dex keeps state in memory by default, and "it is not safe to run multiple Dex replicas since each replica would have its own independent state." The `kubernetes`, `postgres` and `etcd` storage backends support HA. `sqlite3` persists data but is not suitable for multiple replicas. The `kubernetes` backend needs extra RBAC manifests. — [Argo CD User Management](https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/)
- **Group claims:** Dex needs `insecureEnableGroups: true` for group claims. Some IdPs (Okta, OneLogin, Microsoft) send groups with default scopes, while others need `requestedIDTokenClaims`. When groups are missing from the ID token, `enableUserInfoGroups` queries the UserInfo endpoint. — [Argo CD User Management](https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/)
- **Stale groups:** Group changes apply only after the user re-authenticates. If `userInfoCacheExpiration` is unset or exceeds the token lifetime, "the argocd-server will cache group information as long as the ID token is valid!" — [Argo CD User Management](https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/)
- **No silent refresh with Dex:** Dex's embedded login ignores `refreshTokenThreshold`, so users must log in again once the Dex ID token expires. Dex tokens expire after 24 hours. — [Argo CD User Management](https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/); [Argo CD Security](https://argo-cd.readthedocs.io/en/stable/operator-manual/security/)
- **Other caveats:** `insecureSkipEmailVerified` applies to every identity on a connector, so CI and human connectors should be kept separate. Token exchange requires Dex. `argocd logout` against an unreachable server logs out locally only, and the token stays valid until expiry. — [Argo CD User Management](https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/)

**Group-to-RBAC mapping**
- Argo CD RBAC uses Casbin. Policy lines take the form `p, <role/user/group>, <resource>, <action>, <object>, <effect>`, and group bindings take the form `g, <user/group>, <role>`. The built-in roles are `role:readonly` and `role:admin`. — [Argo CD RBAC](https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/)
- The `scopes` setting (default `[groups]`, e.g. `[groups, email]`) picks which OIDC claims are matched. The user identity comes from `federated_claims.user_id`. — [Argo CD RBAC](https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/)
- `policy.default` grants a baseline to every authenticated user, and a `deny` cannot remove it. The docs recommend a minimal default role. Anonymous access (`users.anonymous.enabled`) grants the default policy without login. — [Argo CD RBAC](https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/)
- AppProjects can define project-scoped roles with their own `policies` and `groups` lists, so AD groups can be delegated per project/tenant. — [Argo CD RBAC](https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/)
- **Resources and actions:** applications (get/create/update/delete/sync/rollback/action/override), applicationsets, clusters, projects, repositories, accounts, certificates, gpgkeys, logs (get), exec (create) and extensions (invoke). The object for application-scoped resources is `<project>/<app>`, or `<project>/<ns>/<app>` with apps-in-any-namespace. — [Argo CD RBAC](https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/)
- **Fine-grained rules:** Since v3.0, application `update`/`delete` no longer cascade to sub-resources. Sub-resource rules use `<action>/<group>/<kind>/<ns>/<name>`. `rollback` is opt-in (`server.rbac.rollback.enforce.enable`). From v3.2, `requireOverridePrivilegeForRevisionSync` can treat syncing to a chosen revision as `override`; it defaults to false. — [Argo CD RBAC](https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/)
- **Evaluation:** `deny` wins over `allow`. `policy.<name>.csv` keys are concatenated, which suits Helm/Kustomize overlays. Policies can be tested with `argocd admin settings rbac validate` and `argocd admin settings rbac can`. — [Argo CD RBAC](https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/)

### Inferences
- In a private cloud with AD, the two usual patterns are (a) bundled Dex with the LDAP connector, binding to AD over LDAPS with `recursionGroupAttr` for nested groups, or (b) Keycloak or ADFS as the OIDC IdP, configured directly in `oidc.config`. Pattern (a) needs a persistent Dex storage backend if HA is required.
- Group names in AD (CN values via `nameAttr`) become the strings used in `g,` lines, so naming conventions in AD carry straight into Argo CD policy.

### Gaps
- I found no official Argo CD documentation dedicated to ADFS (SAML or OIDC) on the pages fetched. The Argo CD docs site has separate provider guides that were not fetched.
- The Dex LDAP page does not state refresh-token behaviour for LDAP or whether the connector carries a stability label.

## Does Flux have a built-in UI or user authentication? What UIs exist, with what licences, maintainers and auth options?

### Takeaway
Core Flux has no UI and no user-facing API server or login. Users interact through `kubectl` or the `flux` CLI, under their own Kubernetes credentials. The main UI as of 2026 is the Flux Operator Web UI from ControlPlane. It is AGPL-3.0, supports OIDC SSO (Dex, Keycloak, Entra, OpenShift), and enforces per-user Kubernetes RBAC through impersonation. Weave GitOps (Apache-2.0) is effectively unmaintained since the Weaveworks shutdown. Headlamp, Backstage, Freelens, Capacitor, Radar and flux9s offer plugin or alternative UIs.

### Cited Findings
**Core Flux**
- The Flux ecosystem page lists UIs as separate projects ("These open source projects offer a dedicated graphical user interface for Flux"). It does not describe a built-in UI. — [Flux Ecosystem](https://fluxcd.io/ecosystem/)
- Flux "is built on Kubernetes core controller-runtime and properly adheres to Kubernetes security model including RBAC". The security page describes no Flux-specific user authentication. — [Flux Security](https://fluxcd.io/flux/security/)

**Flux Operator Web UI (ControlPlane)**
- The ecosystem page describes it as "Mission Control for GitOps - A lightweight, mobile-friendly web interface providing real-time visibility into your GitOps pipelines". It is embedded in the Flux Operator and "comes with SSO support via OIDC & Kubernetes RBAC for multi-tenant clusters." — [Flux Ecosystem](https://fluxcd.io/ecosystem/)
- **Licence and maintainers:** The Flux Operator is AGPL-3.0, "developed by CNCF Flux core maintainers part of the ControlPlane team". It describes itself as a CRD controller that manages the lifecycle of CNCF Flux, and it also ships a Flux MCP Server for AI assistants. — [flux-operator GitHub](https://github.com/controlplaneio-fluxcd/flux-operator)
- **Default access:** The UI is unauthenticated and read-only by default, running as the `flux-operator` service account. It does not show Secrets or ConfigMaps. An anonymous username and groups can be set and bound to roles. — [Flux Web UI User Management](https://fluxoperator.dev/docs/web-ui/user-management/)
- **SSO:** SSO uses OAuth2/OIDC with client ID, secret, issuer URL and base URL. There are official guides for Dex, Keycloak, Microsoft Entra and OpenShift. For Entra, Dex is suggested as an intermediary to obtain groups. The config lives in a Secret that the operator watches and reloads without downtime. The Config API includes `autoLogin` and CEL claim mapping. — [Flux Web UI SSO with Dex](https://fluxoperator.dev/docs/web-ui/sso-dex/); [SSO with Keycloak](https://fluxoperator.dev/docs/web-ui/sso-keycloak/); [SSO with Microsoft Entra](https://fluxoperator.dev/docs/web-ui/sso-microsoft/); [SSO with OpenShift](https://fluxoperator.dev/docs/web-ui/sso-openshift/); [Web Config API](https://fluxoperator.dev/docs/web-ui/web-config-api/)
- **LDAP/AD:** There is no direct LDAP support. It would go through Dex (e.g. the Dex LDAP connector) or Keycloak federating AD. The Dex guide shows only a static user and the GitHub connector, and links to Dex connectors for other IdPs. — [Flux Web UI SSO with Dex](https://fluxoperator.dev/docs/web-ui/sso-dex/)
- **Predefined roles:** `flux-web-user` gives read-only access. `flux-web-admin` adds actions: reconcile, suspend, resume, download, patch/restart Deployments/StatefulSets/DaemonSets, create Jobs from CronJobs, delete pods and view logs. Custom verbs (`reconcile`, `suspend`, `resume`, `download`, `restart`) are required in addition to `patch`. Roles can be disabled with `web.rbac.createRoles: false`. — [Flux Web UI User Management](https://fluxoperator.dev/docs/web-ui/user-management/)
- **Docs inconsistency:** The Dex guide calls the admin user's access "read-only access to all resources" in one place and full action access via `flux-web-admin` in another. — [Flux Web UI SSO with Dex](https://fluxoperator.dev/docs/web-ui/sso-dex/)

**Weave GitOps**
- The repo is Apache-2.0 and says it "is transitioning to a community driven project". No maintainer is named beyond the weaveworks org. The install snippet references v0.39.0-rc.2. — [weave-gitops GitHub](https://github.com/weaveworks/weave-gitops)
- **Status (third-party test, dated May 2026):** Weaveworks shut down in February 2024. The last stable release is v0.38.0 (Dec 6, 2023), and a v0.39.1 RC appeared in January 2026. Helm chart 4.0.36 still pins v0.38.0, and the official Helm repo had TLS errors. The dashboard errors on HelmReleases because it calls the deprecated v2beta1 API. The article advises against Weave GitOps for new projects. — [computingforgeeks](https://computingforgeeks.com/weave-gitops-install-migration-flux/). The RC number (v0.39.0-rc.2 vs v0.39.1) conflicts with the [GitHub README](https://github.com/weaveworks/weave-gitops).
- **Auth:** OIDC (tested with Keycloak) plus one bcrypt-hashed emergency `adminUser` Secret, which is not recommended for production. The dashboard impersonates the logged-in user against the Kubernetes API. — [computingforgeeks](https://computingforgeeks.com/weave-gitops-install-migration-flux/); [Weave GitOps docs mirror – emergency user](https://volschin.github.io/weave-gitops/docs/0.27.0/configuration/emergency-user) (unofficial mirror)

**Other UIs listed by Flux**
- The Headlamp Flux plugin visualizes Flux and supports "quick syncing, suspending/resuming, and others." — [Flux Ecosystem](https://fluxcd.io/ecosystem/)
- **Headlamp plugin details:** By default it hides Edit/Scale/Delete/Rollback on Flux-managed resources and shows read-only YAML instead; an admin can re-enable these per cluster. It installs from the Headlamp desktop catalog or in-cluster via the `ghcr.io/headlamp-k8s/headlamp-plugin-flux` init container. — [headlamp-k8s/plugins flux](https://github.com/headlamp-k8s/plugins/tree/main/flux)
- Other entries: the Backstage Flux plugin (sync, suspend/resume), Capacitor (gimlet-io), Radar (skyhook-io), flux9s (TUI), the Freelens extension, Kubeapps and VS Code GitOps Tools. — [Flux Ecosystem](https://fluxcd.io/ecosystem/)

### Inferences
- For a self-hosted, AD-backed Flux UI, the realistic choice in 2026 is the Flux Operator Web UI behind Dex (LDAP connector) or Keycloak. Its AGPL-3.0 licence may need legal review if the operator is modified or redistributed.
- Headlamp inherits its own auth (kubeconfig or OIDC) and uses the user's Kubernetes RBAC, but I did not verify this from a source here.

### Gaps
- I did not verify the licence or maintainers of the Headlamp Flux plugin; the README fetched did not state them. Headlamp's own OIDC configuration was also not checked.
- I could not find the latest Flux Operator release number or date in the fetched sources.
- Licences and auth for Capacitor and Radar were not checked.

## How does Kubernetes RBAC interact with each tool for tenant users?

### Takeaway
The two tools draw the security boundary in different places. Argo CD's API server is the boundary: users authenticate to Argo CD, Argo CD RBAC authorizes them, and actions run under Argo CD's service accounts. Tenant users need no Kubernetes RBAC of their own, but tenants must be isolated through AppProjects plus optional sync impersonation (beta since v3.5). Flux has no user layer. Kubernetes RBAC is the only boundary, for human users (kubectl, flux CLI, Web UI via impersonation) and for reconciliation (per-tenant `serviceAccountName` impersonation).

### Cited Findings
**Argo CD**
- "By default, application syncs in Argo CD have the same privileges as the Argo CD control plane." This forces the control plane to hold the privileges of the most privileged tenant. — [Argo CD Sync with Impersonation](https://argo-cd.readthedocs.io/en/stable/operator-manual/app-sync-using-impersonation/)
- **Sync impersonation:** Beta, introduced in v3.5.0. It is enabled with `application.sync.impersonation.enabled: 'true'`, and AppProject `.spec.destinationServiceAccounts` maps destination server/namespace pairs to service accounts. With enforcement on (the default), a missing match fails the sync. Impersonation covers sync, prune, finalizer deletion and user-triggered UI operations. — [Argo CD Sync with Impersonation](https://argo-cd.readthedocs.io/en/stable/operator-manual/app-sync-using-impersonation/)
- `logs`/`exec` RBAC lets Argo CD users view pod logs or open a shell through the UI, similar to `kubectl logs/exec`, without holding Kubernetes RBAC themselves. — [Argo CD RBAC](https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/)
- `argocd login --core` bypasses Argo CD's RBAC enforcer and relies on Kubernetes RBAC. Actions taken this way are not attributed to a named user in the audit log. — [Argo CD User Management](https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/)
- External cluster credentials are stored as Secrets in the argocd namespace. Revocation means deleting the RBAC on the managed cluster and removing the cluster entry. — [Argo CD Security](https://argo-cd.readthedocs.io/en/stable/operator-manual/security/)

**Flux**
- "Flux does not reconcile a tenant's repo under the `cluster-admin` role." Tenants specify a service account, and controllers use the Kubernetes Impersonation API to act as it. — [Flux Security](https://fluxcd.io/flux/security/)
- **Lockdown flags:** `--no-cross-namespace-refs=true` (tenants cannot use other tenants' sources or events), `--no-remote-bases=true` (kustomize-controller) and `--default-service-account=default` (Kustomizations and HelmReleases without `serviceAccountName` use a permissionless default SA; source-watcher needs Flux v2.10.0+). The platform `flux-system` Kustomization keeps cluster-admin. — [Flux Multi-tenancy lockdown](https://fluxcd.io/flux/installation/configuration/multitenancy/)
- **Web UI:** "The Web UI impersonates the authenticated user when making requests to the Kubernetes API server". "Kubernetes RBAC is the security boundary for the Web UI", and there are no extra Flux-specific checks. Namespace lists depend on `get` on `ResourceSet`. Tenants are scoped via namespace RoleBindings of `flux-web-admin` to their IdP group, e.g. per-team bindings in `apps-1`/`apps-2`. — [Flux Web UI User Management](https://fluxoperator.dev/docs/web-ui/user-management/); [Flux Web UI SSO with Dex](https://fluxoperator.dev/docs/web-ui/sso-dex/)
- The Dex guide advises short ID-token expiry "as the ID token holds the session RBAC permissions". — [Flux Web UI SSO with Dex](https://fluxoperator.dev/docs/web-ui/sso-dex/)

### Inferences
- With Flux, AD groups must reach the Kubernetes API server for `kubectl`/`flux` CLI use (API-server OIDC pointed at Dex or Keycloak, or a managed equivalent) and the Web UI's OIDC config, and RoleBindings carry the policy. With Argo CD, AD groups only need to reach Argo CD, and the policy lives in `argocd-rbac-cm` and AppProjects. Argo CD therefore duplicates an authorization layer, while Flux reuses Kubernetes RBAC.

### Gaps
- I did not fetch how to configure kube-apiserver OIDC against AD/Dex for Flux CLI users; it is outside these docs.

## Audit logging capabilities for user actions

### Takeaway
Argo CD has an application-level audit trail: Kubernetes events that record the actor, plus API-server request logs. Git history covers configuration changes. Flux and its UIs have no separate user audit log. Because the Flux Web UI and Weave GitOps impersonate users, user actions should show up under the user's identity in Kubernetes API audit logs (inferred). Git remains the change log.

### Cited Findings
- **Git history:** "the Git commit history provides a natural audit log of what changes were made to application configuration". It covers only Git and "does not necessarily correlate one-to-one with events" in the cluster. — [Argo CD Security](https://argo-cd.readthedocs.io/en/stable/operator-manual/security/)
- **Kubernetes events:** Argo CD emits events for application activity and records the actor when known. Retention is short, and third-party tools can export events. — [Argo CD Security](https://argo-cd.readthedocs.io/en/stable/operator-manual/security/)
- **API request logs:** Most request payloads are logged, except sensitive methods such as cluster creation and session creation. Client IPs are not logged, so the docs recommend logging them at a proxy. Security entries carry a `security` field, but "not all security logs are comprehensively tagged yet". — [Argo CD Security](https://argo-cd.readthedocs.io/en/stable/operator-manual/security/)
- **Unattributed actions:** `argocd login --core` actions are not attributed to a named user. — [Argo CD User Management](https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/)
- **Argo CD sessions:** Admin JWTs expire in 24h, and changing the admin password revokes them. SSO token expiry and revocation are handled by the IdP. — [Argo CD Security](https://argo-cd.readthedocs.io/en/stable/operator-manual/security/)
- **Flux Web UI:** The user-management docs say nothing about audit logging of user actions (reconcile, suspend and so on). Requests are made by impersonating the user. — [Flux Web UI User Management](https://fluxoperator.dev/docs/web-ui/user-management/)
- **Flux security page:** It does not discuss Kubernetes audit logs or events in a security context. — [Flux Security](https://fluxcd.io/flux/security/)
- **CLI inspection:** A third-party source lists `flux events` and `flux trace` among the Flux CLI's inspection commands. — [computingforgeeks](https://computingforgeeks.com/weave-gitops-install-migration-flux/)

### Inferences
- Because the Flux Web UI uses Kubernetes impersonation, Kubernetes API-server audit logs would record the impersonated user and groups (with the operator SA as the authenticated principal). That makes the kube-apiserver audit policy the Flux audit mechanism. This is standard Kubernetes behaviour, not confirmed in Flux docs.
- Argo CD users act through Argo CD's service account (unless sync impersonation is on), so Kubernetes audit logs show the Argo CD SA. Per-user attribution depends on Argo CD's own events and logs.

### Gaps
- I found no official source describing a dedicated audit log in the Flux Operator Web UI or Weave GitOps.
- I did not find documentation of Argo CD's exact event reasons/fields for user-initiated sync/delete, or any notification-based audit integration.
