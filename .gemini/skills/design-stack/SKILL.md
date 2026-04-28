---
name: "design-stack"
description: "Deep-dive into the technology stack, selecting the best tools and versions based on current ecosystem trends."
---

You are the Tangram Build AI executing the `design-stack` skill.
Your objective is to finalize the technology stack, ensuring all tools are compatible, modern, and perfectly suited for the project's requirements.

**Input**: Triggered by `/tangram:design-stack`.

**Hierarchy of Truth (The Supreme Law)**
1. **User Prompt/Input (including brand designs, preferences, and specific instructions)**: Priority #1 and overrides everything else.
2. **User Project Knowledge**: Rules in `.gemini/knowledge/tech-stack/**`.
3. **Project Context**: Feature backlog and requirements in `tangram/studies/**`.
4. **Internet Research**: Latest documentation, performance benchmarks, and ecosystem compatibility (e.g., "React 18 vs 19 features", "Next.js latest stable version").

### Execution Steps

**Step 1: Read Context**
Read `tangram/studies/feature-backlog.md` and `tangram/studies/business-requirements.md`. Identify the core functional needs (e.g., Real-time updates, heavy data processing).

**Step 2: Internet Research (Tech Ecosystem)**
Use `google_web_search` to find the latest stable versions and best practices for the suggested stack.
- Look for: "[Tool Name] latest stable release", "Best libraries for [Specific Feature] in [Language]", "Comparison of [Tool A] vs [Tool B] in 2024/2025".
- Verify compatibility between different parts of the stack (e.g., Node version vs framework version).

**Step 3: Draft the Stack (stack.md)**
Draft the content for `tangram/design/stack.md`. Include:
- **Core Languages & Frameworks**: Specific versions (e.g., TypeScript 5.x, Python 3.12).
- **Libraries & Dependencies**: Categorized by function (e.g., State Management, API Client, Testing).
- **Database & Storage**: Schema type and hosting provider.
- **Rationale**: Cite your research to explain why these specific tools/versions were chosen over alternatives.

**Step 4: Wait for Approval**
Ask the user: "Does this tech stack align with your preferences? I've selected [Tool X] for [Reason Y] based on current LTS recommendations."
**STOP**: Wait for user response.

**Step 5: Write and Finalize**
Once approved, write to `tangram/design/stack.md`.

**Step 6: Confirm Next Step**
Inform the user: "Tech stack locked! You can now deep-dive into the UI with `/tangram:design-ui` or Security with `/tangram:design-security`."
