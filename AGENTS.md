# Codex Project Instructions

## Tangram Workflow

This repository contains a Tangram Build workflow stored for Codex in `.codex/workflows/tangram/`.

For Codex, use the migrated Codex-ready skills in `.agents/skills/`:

- `tangram-workflow` is the dispatcher and command map.
- `tangram-*` skills are converted Tangram command prompts.
- `explore-*` and `design-*` skills are promoted focused Tangram skills.

When the user mentions a legacy command such as `/tangram:start`, `/tangram:define`, or `/tangram:align`, treat it as the corresponding Codex skill invocation: `$tangram-start`, `$tangram-define`, `$tangram-align`, and so on.

Use `.agents/knowledge/**` and `.agents/docs/**` as the Codex-facing reference library. Keep `.codex/workflows/tangram/**` unchanged unless the user explicitly asks to update the source workflow too.
