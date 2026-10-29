# RepoGuide Tour 仓库导览

[English](./README.md)

把新人任务变成带源码依据的阅读路线、独立浏览器报告和按需执行的命令核验记录。**0.1.0 是普通插件**，没有 MCP Apps 页面。它使用 ZCode 已有的模型、文件读取/搜索和终端工具，不捆绑 Serena、Aider、Repomix、其他 Agent 框架、Hook 或 MCP 服务。

## 环境与安装

- Node.js **24+**、支持 Command/Skill 的 ZCode。Git 可选：无法读取的 commit/dirty 信息标为未知，不编造。
- 仅核验命令时需要 npm/pnpm。目标项目的依赖和外部服务仍需按该项目要求准备。
- 按仓库标准流程构建，在 ZCode **插件市场 → 新增** 中添加生成的 `dist/local-marketplace`，选择 `repo-guide` 安装、启用，再开新会话。运行过 `build_dist.py` 后先用 `pnpm marketplace:local` 恢复本地来源。
- 修改后重建、刷新来源、重新安装并打开新会话。源码目录不是实际安装副本。

如果无关 UI 插件阻塞全仓构建，可先生成仅含本插件的独立冒烟测试源。在仓库根目录的 **Git Bash** 执行：

```bash
PLUGIN="$PWD/external_plugins/repo-guide"
node "$PLUGIN/scripts/stage-demo.mjs" --out ../repo-guide-demo-market
/usr/bin/cygpath -am "$PWD/../repo-guide-demo-market"
```

输出目录必须尚不存在。将打印的 Windows 路径添加到 ZCode，从 `repo-guide-demo-local` 安装并启用 `repo-guide`。更新时重新生成到新目录并调整来源路径，或保留所需文件后手动清理旧生成目录。这**仅用于本插件冒烟**，不替代全仓构建、分发和 CI，也不会自动安装或启用插件；仍需在桌面端核对命令发现和实际运行。

## 使用入口

| 命令 | 行为 |
| --- | --- |
| `/repo-guide:onboard <任务>` | 读取相关代码，组织阅读路线；获得导出授权后生成 `tour.json`、`report.md`、`report.html`。不运行项目脚本。 |
| `/repo-guide:verify <脚本名>` | 展示 npm/pnpm 脚本及其影响，用户选择后执行，把实际结果附到新报告。 |
| `/repo-guide:contribute <目标>` | 对照已有贡献规范，提出提交清单与聚焦的文档草稿；请求导出/应用后才写入，不自动做 Git 提交或远程发布。 |

示例：`/repo-guide:onboard 我要修改任务名称校验，先找到实现、测试和贡献规范。`

contribute 是模型辅助流程，并非确定性的补丁生成器。浏览器报告可以切换步骤、阅读真实片段，不执行命令、修改源码或跳转编辑器。文件/行号校验不保证模型解释必然正确，仍需人工复核。

## 独立脚本与课堂 Demo

在仓库根目录用 Git Bash 执行。`PLUGIN` 是这里主动定义的普通变量，不假设宿主自动注入；含空格路径保留双引号。每次 run/build 的输出目录必须是**新目录**、父目录已存在，并且位于目标仓库和插件安装目录之外，以免覆盖旧证据或改变被分析仓库的 Git 状态。

```bash
PLUGIN="$PWD/external_plugins/repo-guide"
mkdir ../repo-guide-demo
cp -R "$PLUGIN/examples/demo-repo" ../repo-guide-demo/repository
cp "$PLUGIN/examples/tour-plan.json" ../repo-guide-demo/plan.json

# 只读查看元信息、已声明脚本、包管理器和 Git 状态。
node "$PLUGIN/scripts/repo-guide.mjs" inspect --repo ../repo-guide-demo/repository

# 手工编写的样例计划 -> 脚本校验来源 -> 离线 HTML；状态为未执行。
node "$PLUGIN/scripts/repo-guide.mjs" build \
  --repo ../repo-guide-demo/repository --plan ../repo-guide-demo/plan.json \
  --out ../repo-guide-demo/tour-unrun

# 确认 npm run test、生命周期脚本及副作用后再执行。
# 该教学样例没有需安装的依赖，运行三项 Node 测试。
node "$PLUGIN/scripts/repo-guide.mjs" run \
  --repo ../repo-guide-demo/repository --plan ../repo-guide-demo/plan.json \
  --script test --out ../repo-guide-demo/check-pass --timeout 60000 --confirm

node "$PLUGIN/scripts/repo-guide.mjs" build \
  --repo ../repo-guide-demo/repository --plan ../repo-guide-demo/plan.json \
  --out ../repo-guide-demo/tour-verified \
  --result ../repo-guide-demo/check-pass/verification.json
```

在浏览器打开 `../repo-guide-demo/tour-verified/report.html`，点击步骤或上一步/下一步。所有样式、文本均内嵌，不需要服务器、远程字体、CDN 或浏览器网络请求；关闭 JavaScript 时仍可阅读全部步骤。报告是快照，不是实时编辑器。

失败演示：把 run 的脚本改成 `--script test:failure`，并使用新的输出目录；这是刻意写错断言的真实失败测试。超时演示使用 `--script test:slow --timeout 1000`。请单独执行这些命令：它们预期返回退出码 **2**，仍会留下可用于 `build --result` 的 `verification.json`。不存在的脚本标为阻塞；不要编辑记录让演示“成功”。

样例仓库和计划均为手工准备的课堂材料，README 的版本说明缺口是刻意设置的。若展示模型生成，请在复制的样例上调用 onboard 重新分析并创建计划，不将附带计划冒充 AI 实时产出。样例采用 JavaScript ESM 以免安装依赖；首轮用户范围为单应用 Node.js/TypeScript 仓库。

## 数据与核验契约

完整计划见 [`examples/tour-plan.json`](./examples/tour-plan.json)：`schemaVersion: 1`、`title`、`task`，及 1–12 个 steps；每步包含 title、explanation、仓库相对 file、从 1 开始且两端包含的 startLine/endLine，每步最多 60 行。源码片段及 SHA-256 由脚本从真实文件读取；模型提供的片段和状态不予采用。

脚本拒绝越界路径、源码符号链接、常见敏感/生成目录、二进制或无效 UTF-8，以及超过 512 KiB 的来源文件。它不是通用秘密检测器，分享前需检查源码和日志。inspect/build 不执行仓库配置或脚本；其他技术栈仅提供有限只读导览，不承诺通用代码理解。

状态包括：`not_run` 未执行、`passed` 命令退出 0、`failed` 失败、`timed_out` 超时、`blocked` 阻塞、`stale` 待复核。通过不等于已发现相关测试、覆盖率充分或应用正确。记录包含时间、命令来源、Node/平台、退出码和 stdout/stderr（每条流最多 32,000 字符，截断会注明）。默认超时 60 秒，可设为 100 毫秒至 5 分钟；超时会尝试终止所启动的进程树，脚本在树外启动的服务仍可能需人工清理。

记录绑定计划、所引用完整文件内容、package.json 和可读取的 Git commit/dirty 状态；依据变化会标为待复核。未引用文件、已安装依赖和外部服务没有完整指纹。记录是未签名的本地 JSON，不是防篡改证明；编辑/伪造会破坏证据意义，应查看原始日志。Git 不可用时保持未知。

CLI 退出码：inspect/build 成功或核验通过为 0，输入错误为 1，失败/超时/阻塞为 2。在插件目录运行 `node scripts/repo-guide.mjs --help` 查看参数。

## 依赖、权限和副作用

脚本只用 Node 内置库，不自行联网或安装依赖。宿主模型服务仍可能接收代码上下文，“本地读取”不等于离线推理；应按目标仓库选择工具权限。

build 显式创建三个报告文件；run --confirm 写出 verification.json，并以普通用户权限运行选定项目脚本，包括 npm/pnpm 的 pre/post 生命周期脚本。项目代码可能写文件、联网、启动服务，执行器**不是沙箱**。插件不自动安装依赖、创建 Git 提交或远程 PR，不捆绑凭据、后台 Hook 或 MCP 服务。报告与贡献草稿只写入授权位置，辅助脚本不回写插件安装目录。

## 开发检查与来源

```bash
node --test external_plugins/repo-guide/tests/repo-guide.test.mjs
python scripts/validate.py
git diff --check
```

还应完成仓库要求的依赖安装、构建、打包和相应 CI 检查。脚本测试不等于已通过 ZCode 命令发现和真实桌面运行。[`VALIDATION.md`](./VALIDATION.md) 记录本次实现的验证范围和未完成的宿主检查。

采用 Apache-2.0，见 [`LICENSE`](./LICENSE)。实现基于本仓库示例结构独立编写；逐步导览参考 [CodeTour](https://github.com/microsoft/codetour)，按任务分析参考 [Claude feature-dev/code-explorer](https://github.com/anthropics/claude-plugins-official/blob/main/plugins/feature-dev/agents/code-explorer.md)。未捆绑或依赖它们的实现，未导入第三方框架代码、编辑器引擎或外部素材。
