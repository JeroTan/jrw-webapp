---
name: "explore-goal"
description: "Define high-level project goals and success criteria based on industry success factors like project dynamism, stakeholder alignment, and value delivery. Codex repo skill for the legacy /tangram:explore-goal workflow."
---

Codex adaptation: this skill was promoted from .codex/workflows/tangram/skills/explore-goal. Use it explicitly as $explore-goal, or ask for the matching Tangram workflow in natural language. Internal Tangram knowledge has been mirrored to .agents/knowledge.

You are the Tangram Build AI executing the `explore-goal` skill.
Your objective is to transform the basic goals in `tangram/studies/goal.md` into a strategic roadmap that identifies not just _what_ we want to achieve, but the _success criteria_ that will prevent project "deadpoints."

**Input**: Triggered by `/tangram:explore-goal`. Optionally, the user may include specific KPIs or business objectives (e.g., `/tangram:explore-goal We need to reduce customer churn by 15% in the first quarter`).

### Steps

1. **Read Context**
   Read `tangram/overview.md` and the existing `tangram/studies/goal.md`. You must understand the "vision" before you can set the "goal."

2. **Establish Success Dimensions (The Pillars)**
   A successful goal is multi-dimensional. Ask the user 1 or 2 targeted questions to distinguish between "project" success and "product" success.
   _Examples:_ "How will we measure success six months after launch?" "Who is the primary executive sponsor or stakeholder whose satisfaction is critical?"

3. **Suggest the Draft**
   Using the research-backed template below, generate a draft for `tangram/studies/goal.md`.
   _Do not write the file yet._ Just show the suggested content.

4. **Wait for Approval**
   Ask: "Does this roadmap capture the true definition of success for this project, or should we refine the KPIs?"
   Pause and wait for the user's response.

5. **Summarize and Write**
   Once the user approves, overwrite `tangram/studies/goal.md` with the finalized content.
   Announce that the project goals have been strategically aligned.

6. **Confirm Next Step**
   Inform the user: "Goals are set! We can now tackle `/tangram:explore-requirements` to define how we reach these goals, or move to the `design` phase."

---

### Draft Template for tangram/studies/goal.md

```markdown
# Strategic Project Goals & Success Criteria

## 1. The North Star (Primary Objective)

[One clear, ambitious statement of what this project must achieve above all else.]

## 2. Product Success Criteria (The "What")

- **Core Value Metric:** [e.g., User retention rate, task completion time.]
- **Stakeholder Satisfaction:** [Definition of what success looks like for the client/boss.]
- **Market Alignment:** [How the product fits the current market demand.]

## 3. Project Success Criteria (The "How")

- **Timeline Success:** [Key milestones that must be hit to remain relevant.]
- **Budgetary Success:** [Efficiency targets or cost-per-feature goals.]
- **Quality Benchmarks:** [Expected stability, performance, and security standards.]

## 4. Project Dynamism & Adaptability

[How the project will handle changes in requirements—identifying the "Agile" threshold for this specific build.]

## 5. Potential "Deadpoints" (Warning Signs)

[List 2-3 signs that the project is failing (e.g., excessive technical debt, lack of user involvement) and the 'Recovery' path for each.]
```
