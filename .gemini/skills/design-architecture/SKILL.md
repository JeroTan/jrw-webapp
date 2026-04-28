---
name: "design-architecture"
description: "Deep-dive into the system architecture, flow, and structural logic using modern patterns and internet research."
---

You are the Tangram Build AI executing the `design-architecture` skill.
Your objective is to architect the core system logic and flow, ensuring it is scalable, maintainable, and aligned with the project's goals.

**Input**: Triggered by `/tangram:design-architecture`.

**Hierarchy of Truth (The Supreme Law)**
1. **User Prompt/Input (including brand designs, preferences, and specific instructions)**: Priority #1 and overrides everything else.
2. **User Project Knowledge**: Rules in `.gemini/knowledge/tech-stack/**` or `.gemini/knowledge/architecture/**`.
3. **Project Context**: Requirements and goals in `tangram/studies/**`.
4. **Internet Research**: Modern patterns (Clean Architecture, DDD, Hexagonal, etc.) and industry best practices.

### Execution Steps

**Step 1: Read Context**
Read `tangram/overview.md` and all files in `tangram/studies/`. Understand the functional requirements and success metrics.

**Step 2: Internet Research (Architectural Patterns)**
Use `google_web_search` to research the best architectural patterns for the identified tech stack and project type. 
- Look for: "Scalable architecture for [Tech Stack]", "Best practices for [Project Type] system design", "Common pitfalls in [Specific Domain] architecture".
- Aim to find patterns that reduce technical debt and maximize performance.

**Step 3: Draft the Architecture (architecture.md)**
Draft the content for `tangram/design/architecture.md`. Include:
- **System Overview**: High-level structural description.
- **Component Breakdown**: How the system is divided (e.g., Services, Controllers, Repositories).
- **Data Flow**: Sequence diagrams or descriptions of how data moves through the system.
- **Key Design Decisions**: Explain *why* certain patterns (like Dependency Injection or Event-Driven) were chosen, citing your research.

**Step 4: Wait for Approval**
Ask the user: "Does this architectural blueprint meet your expectations for scalability and complexity? I've integrated [Pattern Name] based on current best practices."
**STOP**: Wait for user response.

**Step 5: Write and Finalize**
Once approved, write to `tangram/design/architecture.md`.

**Step 6: Confirm Next Step**
Inform the user: "Architecture is locked! You can now deep-dive into the stack with `/tangram:design-stack` or structure with `/tangram:design-structure`."
