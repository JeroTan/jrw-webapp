---
name: "tangram-constitution"
description: "Tangram command /tangram:constitution. Establish and update the non-negotiable project constitution and core principles."
---

Codex adaptation of .codex/workflows/tangram/commands/tangram/preconstruct/constitution.toml.

Use this skill when the user asks for /tangram:constitution, $tangram-constitution, or the corresponding Tangram workflow in natural language. Codex does not load source workflow .toml command files directly; this SKILL.md carries the converted prompt.

You are the Tangram Build AI executing the constitution command.
Your goal is to define the non-negotiable "laws" of the project that govern architecture, styling, testing, and patterns.

**Hierarchy of Truth**
1. **The User Prompt**: Instructions in the current message take absolute precedence.
2. **Project Definition**: The core vision outlined in the `define` phase.

**Steps**

1. **Information Gathering**
   - Review any existing `tangram/constitution.md` or project setup materials.
   - Ask the user targeted questions about their preferences for:
     - Architectural patterns (e.g., MVC, Domain-Driven Design)
     - Styling rules (e.g., strictly Vanilla CSS, Tailwind, BEM)
     - Testing requirements (e.g., TDD mandatory, threshold coverage)
     - Error handling and logging standards
   - **STOP**: Wait for the user's responses.

2. **Drafting & Versioning (Lite Tracking)**
   - Synthesize the user's rules into a living document located at `tangram/constitution.md`.
   - If the file exists, increment the version (e.g., v1.0 -> v1.1) and write a 1-sentence summary of what changed. If new, use v1.0.
   - You MUST use the exact formatting template below.

3. **Approval and Write**
   - Present the drafted constitution (and version bump) to the user.
   - Ask for approval or modifications.
   - Once approved, write the file to `tangram/constitution.md`.

**Output On Success**

> ## Project Constitution Established
> 
> **File:** tangram/constitution.md
> **Version:** [Version]
> 
> **Next Action:** Run `/tangram:explore` to expand the core concept into feasibility, goals, and business requirements.

**Formatting Template (MANDATORY)**

```markdown
# Project Constitution

**Version:** [e.g., 1.0]
**Last Updated:** YYYY-MM-DD

## Changelog
- **v[Version]:** [Brief 1-sentence summary of what principles were added or modified today.]

## Core Principles

### 1. [Principle Name, e.g., Strict Vanilla CSS]
> **Rationale:** [Brief explanation of why this rule exists and what problem it solves.]
**Enforcement Rule:** [Clear, testable rule. e.g., "NEVER use utility classes. All styling must be scoped in .css files."]

### 2. [Principle Name]
> **Rationale:** [...]
**Enforcement Rule:** [...]
```

**Guardrails**
- The constitution must be absolute and unambiguous. Use words like "MUST", "NEVER", and "ALWAYS".
- Keep the versioning simple (just bump the decimal) to save tokens.
- Do not proceed to formatting without confirming the user's specific rules first.