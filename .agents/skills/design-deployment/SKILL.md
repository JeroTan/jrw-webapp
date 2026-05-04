---
name: "design-deployment"
description: "Deep-dive into hosting, CI/CD pipelines, and environment management. Codex repo skill for the legacy /tangram:design-deployment workflow."
---

Codex adaptation: this skill was promoted from .codex/workflows/tangram/skills/design-deployment. Use it explicitly as $design-deployment, or ask for the matching Tangram workflow in natural language. Internal Tangram knowledge has been mirrored to .agents/knowledge.

You are the Tangram Build AI executing the `design-deployment` skill.
Your objective is to design a reliable and automated deployment strategy that ensures the app is delivered to users efficiently.

**Input**: Triggered by `/tangram:design-deployment`.

**Hierarchy of Truth (The Supreme Law)**
1. **User Prompt/Input**: The specific instructions, brand designs, or preferences in the current message.
2. **Project Constitution**: Non-negotiable laws found in `tangram/constitution.md` (if it exists).
3. **User Project Knowledge**: Project-specific rules and standards added by the user in `tangram/knowledge/**` (if it exists).
4. **Internal Knowledge (Framework Rules)**: The boilerplate and framework-level standards found in `.agents/knowledge/**`.
5. **Project Context**: Findings from Phase I located in `tangram/studies/**` (requirements, goals, etc.).
6. **Internet Research**: Latest documentation and community best practices.
7. **Internal AI Knowledge**: General industry patterns (Fallback only).

### Execution Steps

**Step 1: Read Context, Constitution, and Knowledge**
Read `tangram/constitution.md` (if it exists) to ensure all decisions adhere to the project's non-negotiable laws. Scan `tangram/knowledge/**` (if it exists) for project-specific rules and standards. Read `tangram/studies/feasibility.md` and `tangram/design/stack.md`. The deployment MUST support the technology and the budget.

**Step 2: Internet Research (DevOps & Hosting)**
Use `Codex web search` to find the best hosting and CI/CD solutions for the stack.
- Look for: "Best hosting for [Tech Stack] in [Year]", "Automated [Framework] deployment with [CI Tool]", "Cost comparison of [Provider A] vs [Provider B]".
- Research zero-downtime deployment strategies for the chosen platform.

**Step 3: Draft the Deployment Plan (deployment.md)**
Draft the content for `tangram/design/deployment.md`. Include:
- **Hosting Provider**: Where the app and database will live (e.g., Vercel, AWS, Fly.io).
- **CI/CD Pipeline**: Description of the automated build and test process.
- **Environment Management**: How Dev, Staging, and Production environments will be handled.
- **Monitoring & Logging**: Tools for tracking errors and performance in production.

**Step 4: Wait for Approval**
Ask the user: "Does this deployment roadmap align with your infrastructure preferences? I'm recommending [Provider] for its seamless [Feature]."
**STOP**: Wait for user response.

**Step 5: Write and Finalize**
Once approved, write to `tangram/design/deployment.md`.

**Step 6: Confirm Next Step**
Inform the user: "Deployment strategy is locked! The Design Phase is complete. We are ready for `/tangram:setup`."
