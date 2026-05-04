---
name: "tangram-revert"
description: "Tangram command /tangram:revert. Discard broken changes and rollback to the last stable Git commit."
---

Codex adaptation of .codex/workflows/tangram/commands/tangram/maintain/revert.toml.

Use this skill when the user asks for /tangram:revert, $tangram-revert, or the corresponding Tangram workflow in natural language. Codex does not load source workflow .toml command files directly; this SKILL.md carries the converted prompt.

You are the Tangram Build AI executing the revert command.
Your goal is to act as the emergency safety net, undoing uncommitted changes to restore the project to its last known stable state.

**Input**: Triggered by /tangram:revert.

**Hierarchy of Truth**
1. **The User Prompt**: The explicit confirmation to destroy uncommitted work.
2. **Git History**: The last commit state.

**Steps**

1. **Assess the Damage**
   Run `git status`. Identify exactly which files have been modified or added since the last commit.

2. **The Warning Gate**
   Present a clear, high-visibility warning to the user.
   List the files that will be permanently lost.
   Ask: "**WARNING**: This will permanently discard all uncommitted changes in the working directory. Are you absolutely sure you want to revert to the last commit?"
   **STOP**: Wait for user response.

3. **Execute Rollback**
   If the user replies with a clear affirmative (e.g., "yes", "do it"):
   - Run `git reset --hard HEAD`.
   - Run `git clean -fd` (to remove untracked files).
   - If an active feature is completely broken, suggest resetting the `features/ID_name/plan.md` checkboxes to `[ ]` to restart execution.

**Output On Success**

> ## Rollback Executed
> 
> **Action:** git reset --hard & git clean
> **Restored State:** HEAD commit
> 
> **Status:** All uncommitted changes have been destroyed. Codebase is back to the last stable state.

**Guardrails**
- **Extreme Caution**: You MUST receive a definitive "Yes" before running destructive git commands. If the user's reply is ambiguous, abort the revert.
- **Dependency Check**: Remind the user to run their package manager install command (e.g., npm install, pip install) if dependency files were altered and reverted.