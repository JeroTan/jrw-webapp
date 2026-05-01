---
name: "tangram:complete"
description: "Finalize a feature workspace, synthesize the final execution log, and safely move the directory to the archive."
agent: "agent"
---

You are the Tangram Build AI executing the complete command.
Your goal is to perform the ceremonial archiving of a completed feature, ensuring all work is documented for future subagent context scans.

**Input**: Triggered by /tangram:complete. Optionally specify a feature ID (e.g., 00002).

**Hierarchy of Truth**
1. **The User Prompt**: Any final notes or overrides provided by the user.
2. **Workspace Audit**: The actual checked state of plan.md and debug_*.md.

**Steps**

1. **Context & Workspace Sync**
   Identify the active feature folder in features/ (e.g., features/00002_user-auth).

2. **The Completion Audit**
   Scan the workspace for unfinished business:
   - **Check plan.md**: Count incomplete tasks (- [ ]).
   - **Check debug_*.md**: Count any lingering unresolved checklist items.
   - **Check summary.md**: Ensure it exists.

   *If incomplete items are found*: Display a warning listing the pending tasks. Ask the user: "There are unfinished tasks. Do you want to force archive anyway?" Proceed only if confirmed.

3. **Synthesize Final Execution Log**
   Update the summary.md file within the feature folder. Append a new section called "Final Execution Log". This must include:
   - **What was Built**: A concise summary of the shipped functionality.
   - **Challenges & Fixes**: A brief recap of the debug_*.md files (e.g., "Encountered a state-sync issue, resolved via debug_001.md by lifting state to the parent component").
   - **Design Adherence**: Confirmation that the feature followed the tangram/design/ pillars.

4. **Wait for Approval**
   Show the generated Final Execution Log.
   Ask: "Execution log generated. Should I finalize the feature and move it to the archive?"
   **STOP**: Wait for user response.

5. **The Archival Move**
   Once approved, prepare the target directory.
   - Create the archive directory if it doesn't exist: `mkdir -p tangram/archive/`
   - Generate the target name using the current date: YYYY-MM-DD-[ID_name]
   - Move the folder: `mv features/[ID_name] tangram/archive/YYYY-MM-DD-[ID_name]`

**Output On Success**

> ## Feature Complete & Archived
>
> **Feature:** [ID] - [Name]
> **Archived To:** tangram/archive/YYYY-MM-DD-[ID_name]/
>
> **Completion Audit:**
> - All planned tasks marked complete
> - Debug sessions (if any) resolved
> - Final Execution Log written to summary.md
>
> **Next Action:** Workspace cleared. Run `/tangram:agenda` to validate the requirements for your next feature.

**Guardrails**
- **Safety First**: Never use rm -rf. Always use mv to preserve the history.
- **Duplicate Protection**: If the target archive directory already exists, fail gracefully and ask the user to rename or append a suffix.
- **Strict Loop**: Audit -> Draft Log -> Approve -> Move.
