---
description: Build a task-focused repository tour with checked source excerpts and a browser report
argument-hint: "<task and optional repository path>"
skills: repo-guide
---

Use this plugin's `skills/repo-guide/SKILL.md`, section **Onboard**. Read that file before taking action.
The user's task and scope are: $ARGUMENTS

Use the host's normal file reading and search tools. Do not install another agent framework or MCP server.
Answer in the user's language. Default to read-only discovery; ask where to export before writing the plan and report unless an output location was already authorized.
Find this installed plugin's root from the component location supplied by the host. Invoke its `scripts/repo-guide.mjs` by its real absolute path, not by assuming this plugin is inside the analyzed repository or that a shell variable is automatically defined.
