# Air-Gapped Installation and Software Supply Chain Support: Argo CD vs Flux (as of Nov 2026)

Note on currency: these are the official docs as they read in November 2026 (fetched 2026-11-24). Exact latest release numbers could not be confirmed (GitHub API access was blocked in this session). The Flux docs carry version selectors for v2.8 through v2.10. The Argo CD docs describe features "as of Argo CD 3.5".

## Does each project have an official air-gapped install guide? What images/artifacts must be mirrored?

### Takeaway
Flux has an official air-gapped install page with a mirror-then-bootstrap procedure, plus an official `flux mirror` CLI plugin and Flux Operator settings aimed at air-gapped use. Argo CD's installation docs have no air-gapped, offline or private-registry guidance. Operators have to work out the image list themselves from the manifests or Helm values (argocd, dex, redis, and optionally haproxy).

### Cited Findings
**Flux**
- Flux has an official "air-gapped installation" page. Step one runs on a machine that can reach github.com and ghcr.io: download the Flux CLI from GitHub releases, then list the images with `flux install --export | grep ghcr.io` — [Flux air-gapped](https://fluxcd.io/flux/installation/configuration/air-gapped/)
- Images to mirror are the six controllers: source-controller, kustomize-controller, helm-controller, notification-controller, image-reflector-controller and image-automation-controller. The guide copies them with `crane copy --all-tags ghcr.io/fluxcd/$controller <your-registry>/$controller` — [Flux air-gapped](https://fluxcd.io/flux/installation/configuration/air-gapped/)
- The Flux CLI binary is copied into the air-gapped network. Bootstrap then runs with `flux bootstrap git --registry=registry.internal/fluxcd --url=ssh://git@<host>/<org>/<repo> --private-key-file=... --path=clusters/my-cluster`. You first add an SSH deploy key on the internal Git server — [Flux air-gapped](https://fluxcd.io/flux/installation/configuration/air-gapped/)
- For authenticated registries, add `--registry-creds=username:password --image-pull-secret=regcred`. The CLI creates the secret in `flux-system` and wires it into the controller pods. You can rotate credentials by re-running bootstrap or with `flux -n flux-system create secret oci regcred ...` — [Flux air-gapped](https://fluxcd.io/flux/installation/configuration/air-gapped/)
- Flux images and signatures are published to both ghcr.io and docker.io — [Flux security](https://fluxcd.io/flux/security/)
- The official `flux mirror` CLI plugin (`flux plugin install mirror`; `flux mirror sync <config>` with `--dry-run` and `--overwrite`) mirrors container images, OCI Helm charts, Flux OCI artifacts and other OCI artifacts into an internal registry, "so clusters don't contact upstream registries during reconciliation." It also republishes charts from HTTP/S Helm repositories as OCI artifacts. Opt-in, it copies OCI 1.1 referrers (signatures, SBOMs, attestations) — [flux-mirror plugin](https://fluxcd.io/flux/cli-plugins/flux-mirror/)
- Flux Operator (a ControlPlane project, not the core fluxcd org) has a FluxInstance CRD. `distribution.registry` sets the image source. `distribution.variant` is required for a mirror of a third-party registry (`upstream-alpine`, `enterprise-alpine`, `enterprise-distroless`, `enterprise-distroless-fips`). `distribution.imagePullSecret` handles private registries — [FluxInstance CRD](https://fluxoperator.dev/docs/crd/fluxinstance/)
- If `distribution.artifact` is unset, the operator uses the distribution manifests embedded in its own container image. The docs call this "the recommended setting for air-gapped environments." `distribution.artifactPullSecret` supports a private manifest registry — [FluxInstance CRD](https://fluxoperator.dev/docs/crd/fluxinstance/)
- ControlPlane's enterprise distribution docs say customers can copy images and OCI artifacts (including SBOMs and signatures) to a private registry with `crane copy --all-tags`. The enterprise images need a ControlPlane registry token — [ControlPlane distribution install](https://fluxcd.control-plane.io/distribution/install/)

**Argo CD**
- The official installation page lists plain manifests (`install.yaml`, `namespace-install.yaml`, `ha/install.yaml`, `ha/namespace-install.yaml`, `core-install.yaml`), Kustomize (remote resource plus patches) and a Helm chart described as "currently community maintained" (argo-helm). It does not mention air-gapped, offline or private-registry installs. The manifests are referenced from GitHub and raw.githubusercontent.com URLs — [Argo CD installation](https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/)
- The Argo CD image is `quay.io/argoproj/argocd` — [Argo CD signed release assets](https://argo-cd.readthedocs.io/en/stable/operator-manual/signed-release-assets/)
- Helm chart default images:
  - `global.image`: `quay.io/argoproj/argocd`, tag defaults to the chart appVersion
  - `dex.image`: `ghcr.io/dexidp/dex:v2.46.1`
  - `redis.image`: `ecr-public.aws.com/docker/library/redis:8.6.4-alpine`
  - `redis-ha`: disabled by default; uses the same redis image plus `ecr-public.aws.com/docker/library/haproxy`
  - `global.imagePullSecrets` defaults to `[]`

  Source: [argo-helm values.yaml](https://raw.githubusercontent.com/argoproj/argo-helm/main/charts/argo-cd/values.yaml). Caveat: the registry hostname "ecr-public.aws.com" came from a summarized fetch. The usual hostname is public.ecr.aws, so check it against the file.

### Inferences
- Flux's mirror list is short and uniform (all `ghcr.io/fluxcd/*`, or their docker.io copies), and `--registry` rewrites every image reference at bootstrap. Argo CD images come from three registries (quay.io, ghcr.io, a public ECR mirror), so you rewrite them through Kustomize image overrides or Helm values.
- Flux supports air-gapped operation more fully and officially (guide, mirror plugin, operator embedded distribution). For Argo CD it is a do-it-yourself exercise.

### Gaps
- No official Argo CD air-gapped guide was found. Downstream vendor docs (for example OpenShift GitOps or Akuity) may have one, but they were not researched.
- Exact current versions (Argo CD 3.5.x/3.6, Flux 2.8–2.10) were not confirmed. GitHub release API access was denied in this session.
- The argo-helm chart's current version, and whether it now has a `global.imageRegistry` field, were not confirmed. The values fetch was truncated.

## How does each support OCI sources, private Helm repositories, and custom TLS CAs?

### Takeaway
Both support OCI sources and private Helm and OCI registries with custom CAs. Flux sets CA and mTLS per object (`certSecretRef` or `secretRef` with `ca.crt`) and has native cloud-provider auth. Argo CD keeps CAs in a central `argocd-tls-certs-cm` keyed by hostname, and its OCI sources expect single-layer artifacts.

### Cited Findings
**Flux**
- `OCIRepository` (`source.toolkit.fluxcd.io/v1`) has these fields:
  - `.spec.certSecretRef`: `ca.crt` for a private or self-signed CA; `tls.crt`/`tls.key` for mTLS (PEM, Secret type `Opaque` or `kubernetes.io/tls`)
  - `.spec.insecure`: plain-HTTP registries
  - `.spec.provider`: `generic`, `aws` (ECR via IRSA/node role), `azure` (ACR via Workload Identity), `gcp`
  - `.spec.layerSelector`: `mediaType`, and `operation` `extract` or `copy`

  Source: [Flux OCIRepository](https://fluxcd.io/flux/components/source/ocirepositories/)
- In `GitRepository`, the CA goes in the `.spec.secretRef` Secret as `ca.crt` (or `caFile`; `ca.crt` wins), with `tls.crt`/`tls.key` for mTLS. Other fields:
  - `.spec.proxySecretRef`: HTTP/S or SOCKS5 proxy; takes precedence over environment variables
  - Providers: `generic`, `aws`, `azure`, `github` (GitHub App; supports `githubAppBaseURL` and `ca.crt` for GitHub Enterprise Server)

  Source: [Flux GitRepository](https://fluxcd.io/flux/components/source/gitrepositories/)
- `HelmRepository` supports `type: oci` (for example `oci://ghcr.io/...`) — [Flux HelmChart](https://fluxcd.io/flux/components/source/helmcharts/)
- `flux mirror` can republish HTTP/S Helm repository charts into an OCI registry to help teams move off HTTP `HelmRepository` sources — [flux-mirror](https://fluxcd.io/flux/cli-plugins/flux-mirror/)

**Argo CD**
- OCI sources use `repoURL: oci://registry/image`. `targetRevision` is a tag or digest, and `path` is a subpath (always `.` for Helm charts). Private OCI repos need credentials of type `oci` (`argocd repo add oci://... --type oci --username --password`). The older alternative is `--type helm --enable-oci` with no `oci://` prefix — [Argo CD OCI](https://argo-cd.readthedocs.io/en/stable/user-guide/oci/)
- OCI limits: each image must have a single layer. Accepted layer media types default to `application/vnd.oci.image.layer.v1.tar+gzip` and `application/vnd.cncf.helm.chart.content.v1.tar+gzip`, and you can widen them with `ARGOCD_REPO_SERVER_OCI_LAYER_MEDIA_TYPES`. ORAS pushes need an explicit media type — [Argo CD OCI](https://argo-cd.readthedocs.io/en/stable/user-guide/oci/)
- Custom TLS CAs live in `argocd-tls-certs-cm`, keyed by repository hostname and holding PEM data (the server cert or the signing CA; several are allowed for rollover). Without an entry, the system trust store is used. It is mounted at `/app/config/tls` in argocd-server and repo-server — [Argo CD declarative setup](https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/)
- SSH known hosts live in `argocd-ssh-known-hosts-cm`, which must be filled in before use or SSH connections fail. The Helm chart ships GitHub, GitLab, Bitbucket and Azure DevOps host keys by default, so internal Git hosts must be added — [declarative setup](https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/); [argo-helm values](https://raw.githubusercontent.com/argoproj/argo-helm/main/charts/argo-cd/values.yaml)
- Helm repository secrets (label `argocd.argoproj.io/secret-type: repository`) support `username`, `password`, `tlsClientCertData` and `tlsClientCertKey`, plus `enableOCI: "true"`. They also support per-repo `proxy` and `noProxy`, falling back to the repo-server's proxy environment variables. Not every tool honours the same `noProxy` syntax — [declarative setup](https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/)

### Inferences
- In air-gapped environments with an internal PKI, Argo CD's hostname-keyed central ConfigMap is simple to manage centrally. Flux needs the CA referenced in each source object's Secret, or baked into the controller trust store.
- Argo CD's single-layer OCI requirement can conflict with multi-layer artifacts. Flux's `layerSelector` handles those.

### Gaps
- The `insecure` and `certSecretRef` fields on Flux `HelmRepository` were not fetched directly; the HelmChart page only links to them.
- An Argo CD OCI-repo-specific `insecure` flag and CA handling (whether OCI repos use `argocd-tls-certs-cm`) are not covered on the OCI page.

## What artifact/commit signature verification does each support (Cosign, Notation, GPG)?

### Takeaway
Flux verifies Git commits and tags (PGP and SSH signatures), and OCI artifacts and OCI Helm charts (Cosign key-based or keyless, and Notation). Argo CD verifies only Git sources, with GPG, through the new AppProject `sourceIntegrity` framework (3.5). The legacy `signatureKeys` GPG feature is deprecated. Argo CD has no Cosign or Notation verification of Helm or OCI sources. Both projects sign their own release images with Cosign keyless and publish SLSA L3 provenance and SBOMs.

### Cited Findings
**Flux**
- In `GitRepository`, `.spec.verify` takes the modes `HEAD`, `Tag` and `TagAndHEAD`. It accepts PGP keys (`.asc`) and SSH signing keys (`.sshpub`) in one Secret. Results are reported in a `SourceVerified` condition — [Flux GitRepository](https://fluxcd.io/flux/components/source/gitrepositories/)
- In `OCIRepository`, `.spec.verify.provider` is `cosign` or `notation`:
  - Cosign public keys come from `secretRef` (`.pub`).
  - Cosign keyless uses `matchOIDCIdentity` (issuer and subject regexps). It defaults to Fulcio and rekor.sigstore.dev, and for self-hosted Sigstore it supports `.spec.verify.trustedRootSecretRef` with `trusted_root.json`.
  - Notation needs CA certs plus `trustpolicy.json`.

  Source: [Flux OCIRepository](https://fluxcd.io/flux/components/source/ocirepositories/)
- `HelmChart` `.spec.verify` (cosign or notation) works only for charts from OCI registries. On this page keyless is labelled "experimental", and "custom root CAs or self-hosted Rekor instances are not currently supported." That contrasts with the OCIRepository page, which documents `trustedRootSecretRef` — [Flux HelmChart](https://fluxcd.io/flux/components/source/helmcharts/); contrast [Flux OCIRepository](https://fluxcd.io/flux/components/source/ocirepositories/)
- Flux CLI and controller images are signed with Cosign using GitHub OIDC (`cosign verify ghcr.io/fluxcd/source-controller:<v> --certificate-identity-regexp=^https://github\.com/fluxcd/.*$ --certificate-oidc-issuer=https://token.actions.githubusercontent.com`). Releases include a Syft SPDX SBOM. Since v2.0.0 the build provisionally meets SLSA Build Level 3, and images carry Buildkit provenance attestations — [Flux security](https://fluxcd.io/flux/security/)

**Argo CD**
- The legacy GPG verification page says it "is deprecated and will be removed in the next major Argo CD version" and points to Source Integrity Verification — [Argo CD GPG verification](https://argo-cd.readthedocs.io/en/stable/user-guide/gpg-verification/)
- Source integrity is configured per project in `AppProject.spec.sourceIntegrity`, through manifests or CLI only (no UI yet). Unmet criteria block sync with a ComparisonError. Different sources can have different criteria, and enforcing it disables `argocd app sync --local` — [Argo CD source integrity](https://argo-cd.readthedocs.io/en/stable/user-guide/source-integrity/)
- Git GPG policies live under `spec.sourceIntegrity.git.policies`:
  - `repos`: globs; `!` excludes
  - `gpg.mode`: `none`, `head` (target revision, or annotated tag signature) or `strict` (target plus all ancestors; seal commits can limit depth)
  - `gpg.keys`: trusted key IDs
  - Keys are stored in `argocd-gpg-keys-cm`.
  - It cannot be combined with legacy `signatureKeys`.
  - "Verification is supported only for Git repositories. It is not possible with Helm or OCI application sources."
  - Turn it off with `ARGOCD_GPG_ENABLED=false` on server, repo-server, application-controller and applicationset-controller.

  Source: [Argo CD source integrity git gpg](https://argo-cd.readthedocs.io/en/stable/user-guide/source-integrity-git-gpg/)
- GPG was introduced in v1.7 as `signatureKeys` and became one source-integrity method in 3.5 — [source integrity git gpg](https://argo-cd.readthedocs.io/en/stable/user-guide/source-integrity-git-gpg/)
- InfoQ (June 26, 2026) reports the 3.5 release candidate shipped Source Integrity, and says it is enabled with `sourceIntegrity.required: true` in the Application spec or `argocd app set --source-integrity-required`. The official docs instead describe AppProject-level configuration, so treat the InfoQ detail as possibly RC-specific. The same article reports two other 3.5 changes: mandatory repo-server mTLS (self-signed in-memory certs if none are supplied) and impersonation (beta) — [InfoQ](https://infoq.com/news/2026/06/argocd-supply-chain-security); contrasts with [Argo CD source integrity](https://argo-cd.readthedocs.io/en/stable/user-guide/source-integrity/)
- A design proposal for broader "source verification policies" exists in the Argo CD docs — [Argo CD proposal](https://argo-cd.readthedocs.io/en/stable/proposals/source-verification-policies/)
- Argo CD images (`quay.io/argoproj/argocd`) are Cosign keyless-signed (workflow identity `image-reuse.yaml`, issuer `token.actions.githubusercontent.com`). They have SLSA Level 3 provenance (verified with `slsa-verifier verify-image`). The CLI binaries have provenance `argocd-cli.intoto.jsonl`, and the SBOM `sbom.tar.gz` comes with `.sig`, `.pem` and `argocd-sbom.intoto.jsonl` — [Argo CD signed release assets](https://argo-cd.readthedocs.io/en/stable/operator-manual/signed-release-assets/)

### Inferences
- For air-gapped supply-chain enforcement at deploy time, Flux is clearly ahead: it can verify the signatures on mirrored OCI artifacts and charts, and with Notation or Cosign keys there is no Sigstore connectivity at all. Argo CD can only verify Git commits.
- Flux's default keyless Cosign verification needs Fulcio and Rekor (public internet). Air-gapped Flux users should use key-based Cosign, Notation, or a self-hosted Sigstore with `trustedRootSecretRef` (documented for OCIRepository only).
- Verifying either project's own release images offline with keyless Cosign needs the transparency log material mirrored or verified beforehand on a connected host. The `flux mirror` referrer copying helps carry signatures across.
- Argo CD users needing image or chart signature enforcement would typically add an admission controller (for example Kyverno or Sigstore policy-controller). This is outside the sources above.

### Gaps
- Whether Argo CD has added Cosign or OCI verification to sourceIntegrity in a release after 3.5 (as of Nov 2026) was not confirmed.
- The general availability date of Argo CD 3.5 was not confirmed.

## How are upgrades done offline?

### Takeaway
Flux upgrades offline the same way it installs: mirror the new controller tags (or run `flux mirror sync`), bring in the new CLI, and re-run `flux bootstrap --registry=<mirror>`. With Flux Operator, you upgrade the operator image; it carries an embedded distribution, and a semver range in `distribution.version` picks the new version automatically. Argo CD has no documented offline upgrade path. You mirror the new images, apply the new versioned manifests or Helm chart from local copies, and override image references.

### Cited Findings
- Flux bootstrap is idempotent, and re-running it with new `--registry-creds` updates credentials. The air-gapped page itself has no upgrade section — [Flux air-gapped](https://fluxcd.io/flux/installation/configuration/air-gapped/)
- In FluxInstance, `distribution.version` takes an exact version (pinned) or a semver range such as `"2.8.x"` (automatic upgrades). Candidates are limited to the Flux minor versions embedded in the running operator image. Reconciliation defaults are `reconcileEvery` 1h and `reconcileArtifactEvery` 10m, and `migrateResources` defaults to true — [FluxInstance CRD](https://fluxoperator.dev/docs/crd/fluxinstance/)
- With `distribution.artifact` unset, the embedded artifact is used and no external pull is needed. If you set it to a mirrored OCI URL, the operator polls it for newer releases — [FluxInstance CRD](https://fluxoperator.dev/docs/crd/fluxinstance/)
- `flux mirror sync` copies new tags declaratively, and `--overwrite` re-syncs drifted tags — [flux-mirror](https://fluxcd.io/flux/cli-plugins/flux-mirror/)
- Argo CD install and upgrade use versioned manifests, Kustomize remote bases, or the community-maintained Helm chart. All are referenced from GitHub URLs, with no offline-specific guidance — [Argo CD installation](https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/)

### Inferences
- Offline Argo CD upgrades mean vendoring `install.yaml` (or the chart `.tgz`) for the target version into internal Git, then applying it with image overrides. Argo CD can even manage itself from that internal repo.
- For Flux Operator, the offline upgrade unit is the operator image (plus the mirrored Flux controller images for the new version).

### Gaps
- No official Flux page dedicated to offline upgrades was found. The advice above combines the air-gapped and FluxInstance docs.
- The Argo CD upgrade docs (`operator-manual/upgrading/`) were not fetched.

## Any components that require internet access by default?

### Takeaway
Neither project's docs describe a phone-home or update check. The defaults that point outward are mostly image registries and public endpoints: ghcr.io, quay.io, public ECR, Sigstore for keyless verification, GitHub-hosted manifests, and public SSH host keys. Notifications (Argo CD notifications, Flux notification-controller) only reach external services when someone configures them.

### Cited Findings
- Flux installs out of the box need github.com (CLI releases) and ghcr.io (images) — [Flux air-gapped](https://fluxcd.io/flux/installation/configuration/air-gapped/)
- Flux Cosign keyless verification uses the Fulcio root CA and rekor.sigstore.dev by default. Self-hosted Sigstore is supported through `trustedRootSecretRef` on OCIRepository — [Flux OCIRepository](https://fluxcd.io/flux/components/source/ocirepositories/)
- When `distribution.artifact` is set to the official `oci://ghcr.io/controlplaneio-fluxcd/flux-operator-manifests` (shown as an example), Flux Operator polls an external registry. Leaving it unset uses the embedded artifact — [FluxInstance CRD](https://fluxoperator.dev/docs/crd/fluxinstance/)
- Argo CD manifests and Kustomize bases are fetched from GitHub URLs — [Argo CD installation](https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/)
- Argo CD's Helm chart pulls Dex from `ghcr.io/dexidp/dex` and Redis from public AWS ECR by default. Its default Dex OIDC and GitHub connector examples are commented out, so Dex reaches external IdPs only if configured. Default known_hosts cover GitHub, GitLab, Bitbucket and Azure DevOps — [argo-helm values](https://raw.githubusercontent.com/argoproj/argo-helm/main/charts/argo-cd/values.yaml)
- Argo CD Helm and Kustomize tooling honours proxy settings per repository or through environment variables — [declarative setup](https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/)

### Inferences
- In an air-gapped Argo CD install, you can disable Dex if you use an internal OIDC provider directly, or point it at an internal IdP. The Dex image still needs mirroring if it is enabled.

### Gaps
- No source confirmed or denied an Argo CD UI or server update check or telemetry, or a Flux CLI version check (`flux check` behaviour). Not verified.
- The default notification targets of Argo CD Notifications (catalog of services) were not fetched. The notification-controller and Argo CD notifications docs were not fetched; the claim that they only reach out when configured is an inference.
