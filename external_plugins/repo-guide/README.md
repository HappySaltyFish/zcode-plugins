# RepoGuide Tour

[中文说明](./README_CN.md)

RepoGuide turns a newcomer task into a source-backed reading route, a standalone browser report, and optional command execution evidence. Version **0.1.0** is a **standard plugin**, not an MCP Apps UI plugin. It uses ZCode's existing model, reading/search and terminal tools; no Serena, Aider, Repomix, additional agent framework, Hook or MCP server is bundled.

## Requirements and installation

- Node.js **24+**, ZCode with command/skill support. Git is optional: missing or inaccessible metadata is recorded as unknown, never fabricated.
- npm or pnpm is needed only for command verification. Dependencies/services of the analyzed project remain that project's responsibility.
- Register the generated `dist/local-marketplace` in ZCode's **Plugin Marketplace → New**, install `repo-guide`, enable it, and start a new session. Follow the repository's standard build workflow; after `build_dist.py`, regenerate the local source with `pnpm marketplace:local`.
- After changes: rebuild, refresh the source, reinstall this plugin, and open a new session. A source checkout is not the installed copy.

If unrelated UI builds prevent a classroom smoke test, this plugin can stage its own isolated source without changing the root catalogue. From the repository root in **Git Bash**:

```bash
PLUGIN="$PWD/external_plugins/repo-guide"
node "$PLUGIN/scripts/stage-demo.mjs" --out ../repo-guide-demo-market
/usr/bin/cygpath -am "$PWD/../repo-guide-demo-market"
```

The output directory must be new. Add the printed Windows path in ZCode, then install/enable `repo-guide` from `repo-guide-demo-local`. To refresh it, stage into a new directory and update the source location, or remove the old generated copy manually after preserving anything needed. This source is **only** a plugin smoke-test source; it does not establish that the full repository build, distribution or CI passes. It never installs or enables anything automatically. ZCode runtime discovery must still be checked in the desktop app.

## Commands

| Command | Behavior |
| --- | --- |
| `/repo-guide:onboard <task>` | Read task-related code, propose a route, and with export authorization produce `tour.json`, `report.md`, `report.html`. No project scripts run. |
| `/repo-guide:verify <script>` | Show a declared npm/pnpm script and its impact, execute after approval, and attach the actual record to a fresh report. |
| `/repo-guide:contribute <goal>` | Use existing contribution rules to propose a checklist and a focused documentation draft. Local writing/application requires a user request. No automatic Git or remote publishing. |

Example input: `/repo-guide:onboard I want to change task-name validation. Find the implementation, tests and contribution rules.`

`contribute` is a model-assisted workflow, not a deterministic patch generator. Browser navigation shows checked file excerpts; it cannot execute commands, edit source files or jump into an editor. Explanations still require human review.

## Standalone helpers and classroom demo

Run these from the repository root with Git Bash. `PLUGIN` is an ordinary shell variable set here, not a host-injected variable. Paths containing spaces must stay quoted. Each output directory must be **new**, its parent must exist, and it must be outside both the analyzed repository and installed plugin, so generated files cannot change the target's Git state or overwrite earlier evidence.

```bash
PLUGIN="$PWD/external_plugins/repo-guide"
mkdir ../repo-guide-demo
cp -R "$PLUGIN/examples/demo-repo" ../repo-guide-demo/repository
cp "$PLUGIN/examples/tour-plan.json" ../repo-guide-demo/plan.json

# Read-only: metadata, declared scripts, manager and Git state.
node "$PLUGIN/scripts/repo-guide.mjs" inspect --repo ../repo-guide-demo/repository

# Authored fixture plan -> checked excerpts -> offline HTML. Status: not_run.
node "$PLUGIN/scripts/repo-guide.mjs" build \
  --repo ../repo-guide-demo/repository --plan ../repo-guide-demo/plan.json \
  --out ../repo-guide-demo/tour-unrun

# Execute only after approving npm run test, its lifecycle and side effects.
# This particular fixture needs no installation and runs three Node tests.
node "$PLUGIN/scripts/repo-guide.mjs" run \
  --repo ../repo-guide-demo/repository --plan ../repo-guide-demo/plan.json \
  --script test --out ../repo-guide-demo/check-pass --timeout 60000 --confirm

node "$PLUGIN/scripts/repo-guide.mjs" build \
  --repo ../repo-guide-demo/repository --plan ../repo-guide-demo/plan.json \
  --out ../repo-guide-demo/tour-verified \
  --result ../repo-guide-demo/check-pass/verification.json
```

Open `../repo-guide-demo/tour-verified/report.html` using a browser. Switch steps with the sidebar or Previous/Next. The single file embeds all styling and text; no server, remote fonts, CDN or browser network requests are needed. Without JavaScript all steps remain readable. The checked source is a snapshot, not a live editor.

For a **real failed check**, run the same `run` command with `--script test:failure` and a fresh output directory. Its expectation is deliberately wrong. For a timeout, use `--script test:slow --timeout 1000`. Run these separately: exit code **2** is expected, and `verification.json` remains available for a subsequent `build --result`. Missing scripts produce a blocked record. Never edit a record to make a demo pass.

The fixture and plan are deliberately authored classroom materials; the README version omission is intentional. For a model-generated demo, use onboard on the copied sample and ask the agent to author a new plan rather than presenting the included plan as AI output. The sample is JavaScript ESM for a dependency-free demonstration; single-app Node.js/TypeScript projects are the intended initial user scope.

## Plan and verification contract

See [`examples/tour-plan.json`](./examples/tour-plan.json) for the full plan. Required fields: `schemaVersion: 1`, `title`, `task`, and 1–12 `steps` with `title`, `explanation`, repository-relative `file`, inclusive 1-based `startLine`/`endLine` (1–60 lines each). The script rereads actual files and adds excerpts and SHA-256 values; model-provided excerpts/statuses are ignored.

The helpers reject path traversal, symlink sources, common sensitive/generated paths, binary/invalid UTF-8 and source files over 512 KiB. This is not a general secret detector: review code and logs before sharing reports. `inspect` and `build` do not execute repository scripts or configuration. A non-Node repository can receive a limited tour; no full stack understanding is promised.

Verification states: `not_run`, `passed`, `failed`, `timed_out`, `blocked`, `stale`. Passed means the command exited zero, **not** that relevant tests were discovered or application correctness was proved. Reports include timestamps, declared command source, Node/platform, exit code and bounded stdout/stderr (32,000 characters per stream; truncation flagged). Default timeout is 60 seconds, configurable from 100 ms to 5 minutes. Timeout attempts to terminate the spawned process tree; projects can spawn external services outside that tree and require manual cleanup.

Records are tied to the plan, cited whole-file contents, package.json and available Git commit/dirty state. Changed evidence makes the attached result stale. Uncited files, installed dependencies and external services are not fully fingerprinted. Records are unsigned local JSON, not tamper-proof attestations; attaching an edited/forged record defeats their purpose. Review raw logs. Non-Git or inaccessible Git metadata stays unknown.

CLI exit codes: 0 for successful inspect/build or a passed run; 1 for invalid input; 2 for a failed/timed-out/blocked run. `node scripts/repo-guide.mjs --help` shows options when run from this plugin directory.

## Dependencies, permissions and side effects

The scripts use Node built-ins and do not make network calls or install dependencies. ZCode's model service may receive repository content through the host; local reading does **not** mean offline inference. Enable only tools appropriate to the repository.

`build` explicitly writes three report files; `run --confirm` writes `verification.json` and executes the selected project script with normal user permissions, including npm/pnpm pre/post scripts. That project code may write files, access the network or start services; the helper is **not** an execution sandbox. No automatic dependency installation, Git commits, remote PRs, credentials, background Hooks or MCP services are included. Output and contribution drafts are created only at authorized locations. No data is written into the plugin installation by the helpers.

## Development checks and attribution

```bash
node --test external_plugins/repo-guide/tests/repo-guide.test.mjs
python scripts/validate.py
git diff --check
```

Run the repository's install/build/distribution and relevant CI checks as well; helper tests do not prove ZCode command discovery or desktop runtime behavior. See [`VALIDATION.md`](./VALIDATION.md) for the recorded implementation checks and outstanding runtime validation.

Apache-2.0; see [`LICENSE`](./LICENSE). The implementation is authored in this repository, based on its example plugin structure. [CodeTour](https://github.com/microsoft/codetour) inspired the step-by-step presentation and [Claude feature-dev/code-explorer](https://github.com/anthropics/claude-plugins-official/blob/main/plugins/feature-dev/agents/code-explorer.md) informed the task-oriented analysis approach. Their implementations are not bundled or required. No third-party framework code, editor engine or external assets were imported.
