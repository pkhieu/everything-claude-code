# Official Migration Path: Promtail to Grafana Alloy

Research date: 2026-11-24. Latest Alloy release tag seen: v1.22.0 (from `git ls-remote --tags` on github.com/grafana/alloy). The Alloy Helm chart in the repo's main branch is chart `version: 1.16.0`, `appVersion: v1.22.0` ([Chart.yaml](https://github.com/grafana/alloy/blob/main/operations/helm/charts/alloy/Chart.yaml)). Source-code citations point to grafana/alloy `main` at commit `18f98f3d5f4a5e2a14dc59b5568ed0e2d30cdfd5` (2026-11-23).

## What is the official migration guide (URL) and what steps does it prescribe?

### Takeaway
The official guide is "Migrate from Promtail to Grafana Alloy" at grafana.com/docs/alloy/latest/set-up/migrate/from-promtail/. It has two steps: convert the config with `alloy convert --source-format=promtail`, then run Alloy with the result. As a stopgap, Alloy can also run the Promtail config directly. Promtail reached end of life on March 2, 2026.

### Cited Findings
- Official guide URL: https://grafana.com/docs/alloy/latest/set-up/migrate/from-promtail/. Older doc paths `/tasks/migrate/from-promtail/` still appear in links, and the page has versioned copies for v1.17 through v1.22 and `next`. — [Alloy docs](https://grafana.com/docs/alloy/latest/set-up/migrate/from-promtail/); [Loki migrate index](https://grafana.com/docs/loki/latest/setup/migrate/migrate-to-alloy/)
- "Promtail reached end of life (EOL) on March 2, 2026 and is no longer maintained." — [Alloy migrate guide](https://grafana.com/docs/alloy/latest/set-up/migrate/from-promtail/)
- The Loki Promtail page says "Promtail is end of life (EOL) as of March 2, 2026." It also says commercial support has ended, "All future feature development will occur in Grafana Alloy", and "If you are currently using Promtail, you must migrate to Alloy or another supported client." The deprecation does not cover lambda-promtail. — [Loki Promtail docs](https://grafana.com/docs/loki/latest/send-data/promtail/)
- Step 1, convert: `alloy convert --source-format=promtail --output=<OUTPUT_CONFIG_PATH> <INPUT_CONFIG_PATH>` — [Alloy migrate guide](https://grafana.com/docs/alloy/latest/set-up/migrate/from-promtail/)
- Step 2: run Alloy with the generated config. — [Alloy migrate guide](https://grafana.com/docs/alloy/latest/set-up/migrate/from-promtail/)
- Optional debugging: `--report=<OUTPUT_REPORT_PATH>` writes a diagnostic report, and `--bypass-errors` produces a best-effort conversion. The guide warns that a bypassed conversion "may not match the original Promtail configuration" and should be tested before production. — [Alloy migrate guide](https://grafana.com/docs/alloy/latest/set-up/migrate/from-promtail/)
- The guide has a worked example for systemd journal. Promtail's `journal` scrape config maps to `loki.relabel` plus `loki.source.journal`, with `relabel_rules = loki.relabel.<name>.rules`. The `alloy` user must be in the `adm` and `systemd-journal` groups. — [Alloy migrate guide](https://grafana.com/docs/alloy/latest/set-up/migrate/from-promtail/)
- The Loki docs "Migrate to Alloy" index links to the Promtail guide alongside the Agent Static, Flow, Operator, OTel Collector and Prometheus guides. — [Loki migrate-to-alloy](https://grafana.com/docs/loki/latest/setup/migrate/migrate-to-alloy/)
- The Loki Promtail page also links to a Medium post by a Grafana Developer Advocate and a YouTube video for Docker users. — [Loki Promtail docs](https://grafana.com/docs/loki/latest/send-data/promtail/)

### Inferences
- The official procedure is: convert, review the report, fix errors and warnings by hand, deploy, then fix positions, metrics, dashboards and alerts. No dedicated official cutover runbook (for example, running both side by side) was found.

### Gaps
- I found no official guidance on running Promtail and Alloy in parallel or on a staged cutover.

## How does `alloy convert --source-format=promtail` work, and what are its flags and limitations?

### Takeaway
`alloy convert` turns a Promtail v2.8.x YAML config into Alloy syntax and reports diagnostics at Critical, Error and Warning levels. Errors block output unless you pass `--bypass-errors`. Critical issues always fail the conversion. Known gaps include Promtail's WAL, `stdin` targets, `server.http_path_prefix`, tracing config, CLI-only flags, environment variables and meta-monitoring metrics. The command is labelled public preview.

### Cited Findings
- Flags: `--output`/`-o` (output file), `--report`/`-r` (diagnostic report file), `--source-format`/`-f` (required), `--bypass-errors`/`-b` (bypass errors), `--extra-args`/`-e` (extra arguments in the original format). If `<FILE_NAME>` is omitted or `-`, the input is read from stdin. — [convert CLI reference](https://grafana.com/docs/alloy/latest/reference/cli/convert/)
- Supported source formats: `otelcol`, `prometheus` (v2.45), `promtail` (Promtail v2.8.x), and `static` (Grafana Agent Static). — [convert CLI reference](https://grafana.com/docs/alloy/latest/reference/cli/convert/)
- "Nearly all Promtail features are supported and can be converted to Alloy configuration." Unsupported features produce errors, and options that may need attention produce warnings. — [convert CLI reference](https://grafana.com/docs/alloy/latest/reference/cli/convert/)
- `convert` is labelled public preview (`stage: public-preview` in the doc front matter). The rendered docs say to set the `stability.level` flag to `public-preview` or below to use it. — [convert CLI reference](https://grafana.com/docs/alloy/latest/reference/cli/convert/); [convert.md source](https://github.com/grafana/alloy/blob/main/docs/sources/reference/cli/convert.md)
- Converted values that equal Alloy defaults are omitted from the output. Source defaults that differ from Alloy defaults are written out. — [convert CLI reference](https://grafana.com/docs/alloy/latest/reference/cli/convert/)
- The Promtail converter rejects any `--extra-args` with a Critical error: "extra arguments are not supported for the promtail converter". — [promtailconvert.go](https://github.com/grafana/alloy/blob/main/internal/converter/internal/promtailconvert/promtailconvert.go)
- Top-level validation diagnostics, from source: — [validate.go](https://github.com/grafana/alloy/blob/main/internal/converter/internal/promtailconvert/validate.go); expected output in [testdata/unsupported.diags](https://github.com/grafana/alloy/blob/main/internal/converter/internal/promtailconvert/testdata/unsupported.diags)
  - Error: "Promtail's WAL is currently not supported in Alloy" (when `wal.enabled`)
  - Error: "reading targets from stdin is not supported in Alloy configuration file"
  - Error: "server.http_path_prefix is not supported"
  - Warning: tracing "cannot be migrated to Alloy automatically"
  - Warning: `limits_config` readline rate limits become `stage.limit` stages in each `loki.process`. Unlike Promtail's global limiter, these "apply independently per pipeline rather than across all pipelines combined".
  - Warning: `server.profiling_enabled` is not supported; use Alloy's HTTP server profiling endpoints instead.
  - Warning: Alloy's metrics differ from Promtail's (triggered by `server.register_instrumentation`), so alerts and dashboards must change.
  - Warning: a non-`info` `server.log_level` is not converted; use Alloy's `logging` block instead.
  - Warning: disabling `server.health_check_target` is not supported.
- Errors raised for specific blocks include an unsupported pipeline stage ("The converter does not support converting the provided pipeline stage"), invalid `multiline.max_wait_time`, invalid `drop.older_than`/`longer_than`, and unparseable journal `max_age` (the default of 7h is used). For consul agent, `node_meta` gets a warning that it "will be ignored". — [stages.go](https://github.com/grafana/alloy/blob/main/internal/converter/internal/promtailconvert/internal/build/stages.go); [journal.go](https://github.com/grafana/alloy/blob/main/internal/converter/internal/promtailconvert/internal/build/journal.go); [consul_agent.go](https://github.com/grafana/alloy/blob/main/internal/converter/internal/promtailconvert/internal/build/consul_agent.go)
- Limitations listed in the guide: — [Alloy migrate guide](https://grafana.com/docs/alloy/latest/set-up/migrate/from-promtail/)
  - Promtail CLI arguments that are not in the config file (for example, `-max-line-size`) are not converted.
  - Environment variables, whether expanded in the config or read directly by Promtail (for example, `JAEGER_AGENT_HOST`), need manual handling.
  - Meta-monitoring metric names differ.
  - Alloy's log output and UI differ from Promtail's.
  - Non-DaemonSet deployments must modify the generated `discovery.kubernetes`, because the converter assumes `pod` discovery is a DaemonSet.
  - Conversion is best-effort, so review the output before production.

### Inferences
- The source and the convert reference agree on the severity model: Critical issues (unparseable YAML, render failures, extra-args) always fail, Errors fail unless `--bypass-errors` is set, and Warnings never block.

### Gaps
- No exit codes are documented.
- No official exhaustive list of unsupported Promtail features exists. The list above comes from the converter source.

## Can Alloy run a Promtail config directly (`alloy run --config.format=promtail`)? Any caveats?

### Takeaway
Yes. `alloy run --config.format=promtail <file>` converts the config in memory and starts Alloy without saving the result. Grafana presents it as a temporary transition step. It is public preview, and its bypass flag `--config.bypass-conversion-errors` is not for production.

### Cited Findings
- `alloy run --config.format=promtail <INPUT_CONFIG_PATH>`: the file must be a valid Promtail config, and Alloy converts it in memory without saving the result. — [Alloy migrate guide](https://grafana.com/docs/alloy/latest/set-up/migrate/from-promtail/)
- `--config.format` supports `alloy`, `otelcol`, `prometheus`, `promtail`, and `static` (default `alloy`). `--config.bypass-conversion-errors` defaults to `false`. The "Configuration conversion" section of the run reference has a public-preview stability banner. `--config.extra-args` passes extra flags to the converter. — [run CLI reference (source)](https://github.com/grafana/alloy/blob/main/docs/sources/reference/cli/run.md); [run CLI reference](https://grafana.com/docs/alloy/latest/reference/cli/run/)
- On `--config.bypass-conversion-errors`: "Don't use this flag in a production environment." — [Alloy migrate guide](https://grafana.com/docs/alloy/latest/set-up/migrate/from-promtail/)
- The run reference says to use the bypass flag with caution because "the resulting conversion may not be equivalent to the original configuration." — [run.md](https://github.com/grafana/alloy/blob/main/docs/sources/reference/cli/run.md)
- The default for `--stability.level` is `generally-available`. — [run.md](https://github.com/grafana/alloy/blob/main/docs/sources/reference/cli/run.md)

### Inferences
- Because conversion is public preview and the default stability level is `generally-available`, running with `--config.format=promtail` probably also needs `--stability.level=public-preview`. I did not verify this in code.
- In-memory conversion produces the same component graph as `alloy convert`, so the positions and metrics caveats below still apply.

### Gaps
- I did not confirm whether `alloy run --config.format=promtail` enforces the stability level at runtime.

## How are Promtail positions files / read offsets handled during migration?

### Takeaway
Alloy keeps its own per-component positions file under `--storage.path`. However, the converter writes `legacy_positions_file = <Promtail positions.filename>` into each generated `loki.source.file`. On first start, if no Alloy positions file exists yet and the legacy file is valid, Alloy imports the Promtail offsets, so it should not re-read or skip logs. For this to work, the Promtail positions file (default `/var/log/positions.yaml`) must be readable from inside Alloy, and Alloy's own storage path must survive restarts.

### Cited Findings
- "In Alloy, the positions file is saved at a different location." The guide says to check setups that depend on the old path, such as a Kubernetes Persistent Volume, and update them. — [Alloy migrate guide](https://grafana.com/docs/alloy/latest/set-up/migrate/from-promtail/)
- In `loki.source.file`, the positions data lives inside the directory set by `--storage.path`, in a directory named after the component. When a file leaves `targets`, its position entry is removed, and if the file is re-added it is read from the beginning. — [loki.source.file reference](https://grafana.com/docs/alloy/latest/reference/components/loki/loki.source.file/)
- `legacy_positions_file` "Allows conversion from legacy positions file." The conversion "only occurs if the new positions file doesn't exist and the `legacy_positions_file` is valid". Alloy matches previous positions by path and labels, then falls back to path only. The docs describe this for Grafana Agent Static. — [loki.source.file reference](https://grafana.com/docs/alloy/latest/reference/components/loki/loki.source.file/); [loki.source.file.md source](https://github.com/grafana/alloy/blob/main/docs/sources/reference/components/loki/loki.source.file.md)
- The Promtail converter sets `LegacyPositionsFile: positionsCfg.PositionsFile` and `OnPositionsFileError: restart_from_beginning` on every generated `loki.source.file`. — [scrape_builder.go](https://github.com/grafana/alloy/blob/main/internal/converter/internal/promtailconvert/internal/build/scrape_builder.go)
- Test fixture: Promtail `positions.filename: /good/positions.yml` produces `legacy_positions_file = "/good/positions.yml"` in each `loki.source.file`. — [testdata/globalpositions.alloy](https://github.com/grafana/alloy/blob/main/internal/converter/internal/promtailconvert/testdata/globalpositions.alloy); [globalpositions.yaml](https://github.com/grafana/alloy/blob/main/internal/converter/internal/promtailconvert/testdata/globalpositions.yaml)
- Promtail's default positions path is `/var/log/positions.yaml`. The converter uses this default if the config sets none. — [positions.go](https://github.com/grafana/alloy/blob/main/internal/loki/promtail/positions/positions.go); [promtailconvert.go](https://github.com/grafana/alloy/blob/main/internal/converter/internal/promtailconvert/promtailconvert.go)
- In the component code, `ConvertLegacyPositionsFile` runs when `legacy_positions_file` is set. When legacy positions were used, the tailer retries the offset lookup without labels. — [file.go](https://github.com/grafana/alloy/blob/main/internal/component/loki/source/file/file.go); [tailer.go](https://github.com/grafana/alloy/blob/main/internal/component/loki/source/file/tailer.go)
- `on_positions_file_error` defaults to `restart_from_beginning`, which can duplicate logs. `restart_from_end` and `skip` are the alternatives. `tail_from_end` (default `false`) reads only new logs when no stored position is found. Neither `tail_from_end` nor `restart_from_end` is supported with `decompression`. — [loki.source.file reference](https://grafana.com/docs/alloy/latest/reference/components/loki/loki.source.file/)
- `loki.source.journal` has a `legacy_position` block with `file` and `name` arguments ("Job name used for journal (agent static or promtail)"). Translation "will happens if there is no position file already and is a valid yaml file to convert." — [loki.source.journal.md](https://github.com/grafana/alloy/blob/main/docs/sources/reference/components/loki/loki.source.journal.md)
- The Promtail converter's journal builder does not set `legacy_position`, so it must be added by hand. — [journal.go](https://github.com/grafana/alloy/blob/main/internal/converter/internal/promtailconvert/internal/build/journal.go)
- A community forum thread notes that the docs leave unclear how journal cursors from Promtail are mapped. — [community.grafana.com](https://community.grafana.com/t/clarify-loki-source-journal-legacy-position-behavior-when-migrating-from-promtail-to-alloy-avoid-duplicate-logs/163400)
- The Windows events converter maps Promtail's `bookmark_path` to `legacy_bookmark_path`. — [windows_events.go](https://github.com/grafana/alloy/blob/main/internal/converter/internal/promtailconvert/internal/build/windows_events.go)
- In the Alloy Helm chart, `alloy.storagePath` defaults to `/tmp/alloy`, with the comment "By default, data is lost between reboots." — [values.yaml](https://github.com/grafana/alloy/blob/main/operations/helm/charts/alloy/values.yaml)

### Inferences
- To avoid duplicate or lost logs:
  1. Stop Promtail so its offsets are final.
  2. Make the Promtail positions file reachable at the same path inside Alloy, for example the hostPath or PV Promtail used.
  3. Start Alloy with an empty or new `--storage.path` so the one-time import runs.
  4. Persist `--storage.path` on a hostPath or PV, so Alloy does not fall back to reading from the beginning on each pod restart.
- Logs written between the Promtail stop and the Alloy start are still picked up, because the import resumes from the old offsets. Running both at once would duplicate logs.
- Matching falls back to path only, so changes in labels between Promtail and the converted config should not break resumption for file targets.
- The docs describe `legacy_positions_file` only for Agent Static. That it works for Promtail positions comes from the converter source and test fixtures, not from prose in the docs. Agent Static's logs subsystem was derived from Promtail and shares the positions YAML format, which supports this.

### Gaps
- I found no official step-by-step runbook for positions handover in Kubernetes, and no documentation of journal cursor translation from Promtail.

## What component mapping exists?

### Takeaway
Each Promtail `scrape_config` becomes these Alloy components:
- service discovery maps to `discovery.<sd>` components, plus `discovery.consulagent`
- `relabel_configs` maps to `discovery.relabel`
- file tailing maps to `loki.source.file` (with `file_match`, `legacy_positions_file` and decompression)
- push-style receivers map to `loki.source.<x>` with `loki.relabel`
- `pipeline_stages` maps to `loki.process`
- each `clients` entry maps to its own `loki.write`

### Cited Findings
- `AppendAll`: each `clients` entry becomes a separate `loki.write` (because of possibly different external labels), and `limits_config.max_streams` is passed through. — [promtailconvert.go](https://github.com/grafana/alloy/blob/main/internal/converter/internal/promtailconvert/promtailconvert.go)
- Per scrape config, the converter appends the following. — [promtailconvert.go](https://github.com/grafana/alloy/blob/main/internal/converter/internal/promtailconvert/promtailconvert.go)
  - SD components, plus Consul agent SD
  - `loki.source.file` for SD targets, with relabeling through `discovery.relabel` and glob expansion
  - log-producing sources (cloudflare, journal, push API, syslog, gcplog, windows events, kafka, azure event hubs, gelf, heroku drain) with `loki.relabel`
  - Docker with special handling
  - output to `loki.process` if stages exist, otherwise directly to `loki.write`
- Builder files exist for each source and stage, including the azure_event_hub, cloudflare, consul_agent, docker_sd, gcplog, gelf, herokudrain, journal, kafka, limits_config, loki_write, push_api, service_discovery, stages, syslog and windows_events builders. — [build directory](https://github.com/grafana/alloy/tree/main/internal/converter/internal/promtailconvert/internal/build)
- Generated `loki.source.file` arguments include `encoding`, `decompression`, `file_watch` (from Promtail global `file_watch_config`), `legacy_positions_file`, `on_positions_file_error`, and a `file_match` block driven by `target_config.sync_period`. — [scrape_builder.go](https://github.com/grafana/alloy/blob/main/internal/converter/internal/promtailconvert/internal/build/scrape_builder.go)
- `kubernetes_sd_configs` with `role: pod` becomes `discovery.kubernetes` with `selectors { role = "pod", field = "spec.nodeName=" + coalesce(sys.env("HOSTNAME"), constants.hostname) }`. This is the DaemonSet assumption. — [testdata/kubernetes.alloy](https://github.com/grafana/alloy/blob/main/internal/converter/internal/promtailconvert/testdata/kubernetes.alloy); [kubernetes.yaml](https://github.com/grafana/alloy/blob/main/internal/converter/internal/promtailconvert/testdata/kubernetes.yaml)
- `journal` maps to `loki.relabel` plus `loki.source.journal`. — [Alloy migrate guide](https://grafana.com/docs/alloy/latest/set-up/migrate/from-promtail/)
- `limits_config` readline rate limits become per-pipeline `stage.limit`. — [validate.go](https://github.com/grafana/alloy/blob/main/internal/converter/internal/promtailconvert/validate.go)
- The `loki.source.file` docs recommend the built-in `file_match` block over `local.file_match`. — [loki.source.file reference](https://grafana.com/docs/alloy/latest/reference/components/loki/loki.source.file/)
- The Alloy Kubernetes logs guide lists `discovery.kubernetes`, `discovery.relabel`, `local.file_match`, `loki.source.file`, `loki.source.kubernetes` (reads the API, no system privileges needed), `loki.source.kubernetes_events`, `loki.process` and `loki.write`. It advises that a DaemonSet should only discover pods on the same node. — [Collect Kubernetes logs](https://grafana.com/docs/alloy/latest/collect/logs-in-kubernetes/)

### Inferences
- Pipeline stages missing from the converter's switch produce an Error, so configs with exotic stages need `--bypass-errors` plus a hand-written `stage.*` block.

### Gaps
- I did not collect a full per-stage mapping table (each Promtail stage to its `stage.*` block) from stages.go.

## What are the official Kubernetes/Helm paths?

### Takeaway
The official Kubernetes route is the `grafana/alloy` Helm chart from grafana.github.io/helm-charts, which defaults to a DaemonSet. A Promtail-like setup needs `alloy.mounts.varlog` (and optionally `dockercontainers`) and a persistent `storagePath`. The k8s-monitoring chart is the broader managed option; in v3 it deploys Alloy through the Alloy Operator. I found no official Helm-specific Promtail migration guide.

### Cited Findings
- Install commands: `helm repo add grafana https://grafana.github.io/helm-charts`, then `helm repo update`, then `helm install --namespace <NAMESPACE> <RELEASE_NAME> grafana/alloy`. — [Alloy on Kubernetes](https://grafana.com/docs/alloy/latest/set-up/install/kubernetes/)
- Chart values: `controller.type` defaults to `'daemonset'` (or `deployment`, `statefulset`). `alloy.mounts.varlog` defaults to `false` ("Mount /var/log from the host into the container for log collection"). `alloy.mounts.dockercontainers` defaults to `false`. `volumeClaimTemplates` applies to `statefulset`. `alloy.storagePath` defaults to `/tmp/alloy`. `alloy.stabilityLevel` defaults to `generally-available`. — [values.yaml](https://github.com/grafana/alloy/blob/main/operations/helm/charts/alloy/values.yaml)
- The k8s-monitoring chart 3.0 "no longer uses the Alloy Helm chart as a subchart dependency"; it uses the Alloy Operator, and a v2 migration tool exists at grafana.github.io/k8s-monitoring-helm-migrator. — [k8s-monitoring chart migration](https://grafana.com/docs/grafana-cloud/monitor-infrastructure/kubernetes-monitoring/configuration/helm-chart-config/helm-chart/migrate-helm-chart/) (from search result snippet; not fetched in full)
- A third-party Medium post on Kubernetes migration reports that enabling `alloy.mounts.varlog` was required to read container log files. This is not official. — [Medium](https://medium.com/@vincenthartmann/migrating-from-promtail-to-grafana-alloy-in-kubernetes-53ce4c5b7556)

### Inferences
- A practical Helm cutover:
  1. Run `alloy convert` on the Promtail chart's rendered config.
  2. Put the result in the Alloy chart's `alloy.configMap`.
  3. Set `alloy.mounts.varlog: true`.
  4. Mount the old Promtail positions hostPath (the Promtail chart typically used a hostPath under /run/promtail) at the path the converted `legacy_positions_file` expects.
  5. Set `storagePath` to a hostPath-backed directory.
  6. Uninstall Promtail and install Alloy.
- The Promtail chart's hostPath convention is from general knowledge and was not verified in this research.
- Because the chart's default `stabilityLevel` is `generally-available`, using `--config.format=promtail` in Helm probably needs `alloy.stabilityLevel: public-preview` and extra args. This was not verified.

### Gaps
- I found no official Grafana doc covering Promtail Helm chart to Alloy Helm chart migration, or Promtail migration inside k8s-monitoring.
- I did not fetch the k8s-monitoring migration page in full. Its pod-logs feature options, `podLogs` with file vs. API gathering, were not researched.
