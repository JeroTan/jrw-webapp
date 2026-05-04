---
name: "tangram-workflow"
description: "Dispatcher for the Tangram Build workflow. Use when the user mentions /tangram:* commands, Tangram phases, or asks how to run the Tangram process in Codex."
---

You are the Codex-facing Tangram Build workflow dispatcher.

Codex does not load source workflow `.toml` command files directly. In this repository, each source workflow command has been converted into a Codex skill named `tangram-<command>`, and each source workflow skill has been promoted as a Codex-ready skill under `.agents/skills`.

When the user requests a Tangram command:

1. Map `/tangram:<command>` to `$tangram-<command>`.
2. If the request targets a focused exploration or design skill, map it to the matching promoted skill such as `$explore-requirements` or `$design-ui`.
3. Read only the relevant `SKILL.md` instructions, then execute that workflow.
4. Use `.agents/knowledge/**` as the Codex mirror of the source knowledge reference library.
5. Treat `.codex/workflows/tangram/**` as the legacy source mirror and do not modify it unless the user explicitly asks.

Useful command mappings:

- `/tangram:start` -> `$tangram-start`
- `/tangram:help` -> `$tangram-help`
- `/tangram:define` -> `$tangram-define`
- `/tangram:constitution` -> `$tangram-constitution`
- `/tangram:explore` -> `$tangram-explore`
- `/tangram:design` -> `$tangram-design`
- `/tangram:setup` -> `$tangram-setup`
- `/tangram:agenda` -> `$tangram-agenda`
- `/tangram:plan` -> `$tangram-plan`
- `/tangram:execute` -> `$tangram-execute`
- `/tangram:debug` -> `$tangram-debug`
- `/tangram:complete` -> `$tangram-complete`
- `/tangram:commit` -> `$tangram-commit`
- `/tangram:align` -> `$tangram-align`
- `/tangram:conditioning` -> `$tangram-conditioning`
- `/tangram:revert` -> `$tangram-revert`