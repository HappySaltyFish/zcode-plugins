# Validation record / 实现验证记录

Date: 2026-10-29. Plugin: `repo-guide@0.1.0`, standard plugin. Implementation checks ran on Windows using Node.js 24.22.1, pnpm 10.33.2, Python 3.11.1 and Chrome. Node was selected per process; global tool installations/settings were not changed. No Serena, Aider or Repomix was installed for this plugin.

## Passed / 已通过

| Check | Result |
| --- | --- |
| `node --test external_plugins/repo-guide/tests/repo-guide.test.mjs` | 8 tests pass, no skips: actual npm/pnpm execution, failed/blocked/timed-out outcomes, stale evidence, source/path checks, hostile-text rendering, CLI export and isolated staging. |
| `oxlint external_plugins/repo-guide/scripts external_plugins/repo-guide/tests` | No warnings or errors. |
| `python scripts/validate.py` | All 53 catalogue entries accepted, including the new plugin. |
| `git diff --check` | No whitespace errors in the tracked diff; new files separately inspected. |
| Frozen workspace installation | Completed with the existing lockfile and npm's public registry after the initially configured mirror was inaccessible. No lockfile changes. |
| `pnpm lint` | Exit 0; one existing unnecessary-escape warning in `ui-plugins/craft-runtime/toolchain.mjs`. |
| Classroom helper flow | Copied the authored fixture outside the checkout, generated an unrun report, executed its 3 normal tests through npm, and generated a verified report. Exit 0 with actual test log. |
| Standalone plugin package | Checked with the repository's ZIP builder, separately from the incomplete full-marketplace distribution. The archive contains the manifest, 3 commands, skill, scripts and bilingual docs. |
| Browser smoke, actual Chrome | Five-step report: sidebar and Previous/Next navigation, endpoint buttons, passed badge, 390 px layout with no page overflow, no page exceptions or network requests. Without JavaScript all five steps remain readable. Desktop/mobile screenshots inspected. |

The browser check used an external browser and a report generated from the authored classroom plan. It did not exercise the ZCode host, and it did not validate model-generated reasoning. The fixture's deliberately incorrect test is a failure demonstration, not a failing plugin test.

## Full-repository checks not passed / 尚未通过的全仓检查

These failures were observed in other plugin/build paths left unchanged by this feature; they are not claimed as passing or silently bypassed.

| Command | Observed boundary |
| --- | --- |
| `pnpm build` | Existing Excalidraw build fails on Windows while writing `main.js.LEGAL.txt`: the output path concatenates an absolute path twice. No root local marketplace is produced. |
| `python scripts/build_dist.py` | Stops at the incomplete Excalidraw build. The full distribution is not validated; any partial root dist output must not be used as a complete market. |
| `pnpm typecheck` | OpenPencil's check needs an upstream archive; its download from codeload.github.com failed in the execution environment. |
| `pnpm test` | The initial two root Vitest files pass all 28 tests. The recursive suite fails in Jupyter's platform-specific path expectations; KiCad also reports absent generated resources and Typst reports a platform-dependent expectation failure. |
| `pnpm test:artifacts` | The prerequisite KiCad runtime-preparation tests have 8 passes and 1 failure around lowercase/uppercase proxy handling on Windows; the subsequent artifact checker does not run. |

Windows sandboxing also denied `taskkill /T` during timeout tests. RepoGuide now bounds its wait and explicitly records a cleanup warning when it cannot confirm process-tree termination; a timed-out command is never marked passed. In that case inspect and clean up any remaining project services manually. This helper is not a process sandbox or a complete service manager.

## Still required in ZCode / 仍需真实宿主验证

Register the isolated source created by `scripts/stage-demo.mjs` (or the full local marketplace once its build is fixed), install/enable RepoGuide, and create a new session. Check that all 3 commands and the skill are discovered, then have the agent generate a new plan from the sample and run onboard → verify → contribute. Confirm the draft follows contribution rules and no Git publishing occurs. No ZCode desktop automation/CLI was available in this implementation session, so installation and model-driven end-to-end behavior remain unverified.

isolated source、helper 单元测试、浏览器报告和 ZIP 检查只证明各自范围，不能代替 ZCode 的实际安装、启用和会话验收。按 README 的 Git Bash 步骤可以复现教学样例；自研计划、手工样例与模型输出应分别标注。
