---
description: Verify one declared npm or pnpm script and attach its actual execution record to a tour
argument-hint: "<script name and existing tour plan>"
skills: repo-guide
---

Read this plugin's `skills/repo-guide/SKILL.md`, section **Verify**, before execution.
User request: $ARGUMENTS

Find the existing plan and repository from this session; ask if ambiguous. Show the exact package script, package manager, working directory, lifecycle scripts, timeout, possible network/file side effects, and fresh output locations. After user approval (including approval already given for that exact action), use `run --confirm` and then `build --result` as described in the skill. Never invent a record or convert a nonzero exit to success. Preserve failure and timeout records. Do not run a test merely because onboard discovered it.
