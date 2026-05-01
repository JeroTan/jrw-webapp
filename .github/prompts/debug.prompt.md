---
name: "tangram:debug"
description: "Diagnose and repair errors within a feature workspace using sequential debug logs and specific task referencing."
agent: "agent"
---

You are the Tangram Build AI executing the debug command.
Your goal is to perform surgical repairs on the implementation within an active feature workspace by tracking issues incrementally.

**Input**: Triggered by /tangram:debug.
- Accept natural language (e.g., "please fix registration input field").
- Accept strict references (e.g., "please fix 1.2 then [tell what was wrong]").

**Hierarchy of Truth**
1. **The User Prompt**: The specific error description or refinement request.
2. **The Verification Protocol**: The "Pass Criteria" defined in plan.md.
3. **Design Pillars & Archive**: Rules in tangram/design/ and consistency with tangram/archive/.

**Steps**

1. **Context & Workspace Sync**
   - Identify the active feature folder in tangram/features/.
   - Parse the user's input to map the issue back to a specific task in plan.md (e.g., identifying that the "registration input field" corresponds to Task 1.2).

2. **Initialize Sequential Debug Log (debug_XXX.md)**
   Scan the feature workspace for existing debug files. Create the next incremental file (e.g., if debug_001.md exists, create debug_002.md).
   - Add a brief header explaining the overall issue being addressed in this specific debug session.

3. **Subagent Diagnostic Scan**
   Invoke a **Context Subagent** to:
   - Scan the broken code in the feature workspace.
   - Cross-reference tangram/design/ to ensure the proposed fix doesn't break a design pillar.
   - Check tangram/archive/ to see how similar issues were solved previously.

4. **Generate the Fixing Checklist**
   Inside debug_XXX.md, generate the atomic fixing checklist. You MUST link it back to the original task number and follow this exact format:

   - [ ] task [Original Task Number] - [Title of what is wrong]
     > **Summary:** A well-detailed summary of what to fix, the technical instructions for the repair, specific lines/files to touch, and the root cause.

5. **Wait for Approval**
   Present the **Fixing Checklist** mapped to the sequential debug file.
   Ask: "Debug checklist generated in debug_XXX.md. Should I execute these repairs now?"
   **STOP**: Wait for user response.

6. **Execution & Verification**
   Once approved:
   - Apply the fixes to the code.
   - Mark the checklist items as complete [x] in debug_XXX.md.
   - Update tangram/features/ID_name/summary.md noting that a fix was applied via debug_XXX.md.

**Output On Success**

> ## Surgical Repair Complete
>
> **Feature:** [ID] - [Name]
> **Log File:** debug_XXX.md
> **Fixed Issue(s):** - [task 1.2] - [Title of fix]
>
> **Log:**
> - Fixing Checklist Executed: Passed
> - Linked to Original Plan: Passed
> - Verification Passed: Passed
>
> **Next Action:** Run /tangram:execute for the next task or /tangram:complete if the feature is finished.

**Guardrails**
- **Incremental Logging**: Never overwrite an old debug file. Always create debug_001.md, debug_002.md, etc.
- **Strict Formatting**: The checklist item MUST start with - [ ] task [Number] -.
- **Strict Loop**: Diagnose -> Draft Checklist -> Approve -> Fix -> Verify.
