---
name: "tangram:design"
description: "Architect or update the solution across 6 pillars, prioritizing User Prompt, Project Knowledge, and Project Studies over AI defaults."
agent: "agent"
---

Architect or update the technical blueprint across 6 core pillars.

**Input**: Triggered by /tangram:design. User preferences in the current prompt (including brand markdowns, color formats, and platform targets like Web, Desktop, CLI, or Mobile) take absolute precedence over all other data sources.

**Hierarchy of Truth (The Supreme Law)**
1. **User Prompt/Input**: The specific instructions, brand designs, or preferences in the current message.
2. **Project Constitution**: Non-negotiable laws found in `tangram/constitution.md` (if it exists).
3. **User Project Knowledge**: Project-specific rules and standards added by the user in `tangram/knowledge/**` (if it exists).
4. **Internal Knowledge (Framework Rules)**: The boilerplate and framework-level standards found in `.github/knowledge/**`.
5. **Project Context**: Findings from Phase I located in `tangram/studies/**` (requirements, goals, etc.).
6. **Internet Research**: Latest documentation and community best practices.
7. **Internal AI Knowledge**: General industry patterns (Fallback only).

**Steps**

1. **Step 1: Check State & Knowledge Scan**
   - Check tangram/design/ to determine if this is **Creation** or **Update** mode.
   - **Constitution Scan**: Read `tangram/constitution.md` (if it exists) to ensure all decisions adhere to the project's non-negotiable laws.
   - **Context Scan**: Read tangram/studies/** (specifically business-requirements.md and feature-backlog.md).
   - **Knowledge Scan**: Scan `tangram/knowledge/**` (if it exists) for project-specific rules and standards, and the corresponding `.github/knowledge/` subdirectories for framework standards.
   - *Requirement*: You MUST finish reading these files before proceeding to Step 2.

2. **Step 2: Targeted Internet Research**
   - **Once the Knowledge Scan is complete**, search for the latest documentation, security advisories, or platform-specific best practices (e.g., "Human Interface Guidelines" for Desktop/Mobile or "CLI UX" for terminal apps) for the technologies identified in Step 1.
   - Focus on breaking changes or "LTS" (Long Term Support) recommendations to ensure the design is future-proof.
   - *Requirement*: If the user's knowledge files are outdated compared to the latest stable releases found online, note this as a "Recommendation" but prioritize the user's files unless they ask for the update.

3. **Step 3: Analyze the Change & Consult**
   If in **Update Mode**, acknowledge the specific modification. If a user instruction contradicts an established House Rule in /context/, point it out and ask: "This change overrides our established standard in /context/. Should I proceed?"

4. **Step 4: Develop/Modify the 6 Pillars**
   Draft or update the following files in tangram/design/, strictly following the Hierarchy of Truth:
   - **Architecture (architecture.md)**
   - **Tech-Stack (stack.md)**
   - **UI (ui.md)**: Align with user brand markdowns, color formats, and target platform (Web, Desktop, CLI, Mobile).
   - **File Structure (structure.md)**
   - **Security (security.md)**
   - **Deployment (deployment.md)**

5. **Step 5: Suggest the Draft & Traceability**
   Present the 6-pillar blueprint. Explicitly cite which user knowledge files, studies, or prompt instructions (including brand/color preferences) influenced each design decision.

6. **Step 6: Wait for Approval**
   Ask: "Does this design accurately reflect your specific project standards, brand vision, and target platform, or should we adjust a pillar?"
   **STOP**: Wait for user response.

7. **Summarize and Write**
   Once approved, write/overwrite the finalized content in tangram/design/.

8. **Final Handover & Context Compression**
   Announce: "Design phase complete."
   **REQUIRED PROMPT**: Ask the user to "compress" or "summarize" the current chat context to optimize performance for the **Construction** phase.

**Output On Success**

> ## Technical Design Complete
>
> **Pillars Established:** Architecture, Stack, UI, Structure, Security, Deployment.
> **Alignment:** Cites specific studies and project knowledge rules.
>
> **Next Action:** Run `/tangram:setup` to initialize the project environment and folder hierarchy.

**Guardrails**
- **Sequential Execution**: Do not attempt to search the internet until the internal Knowledge Scan is finished.
- **Context-Driven Design**: Never recommend a tech stack that cannot support the requirements in tangram/studies/.
- **User Preference Overrides All**: If the user wants a "non-standard" pattern, support it.
- **Strict Loop**: Suggest -> Approve -> Summarize -> Confirm.
