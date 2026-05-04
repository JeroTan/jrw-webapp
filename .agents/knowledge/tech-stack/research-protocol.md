# Tech-Stack Research Protocol & Report Standard

This document is the **MANDATORY** authority for tech-stack selection. It governs both the **process** of research and the **structure** of the resulting deliverable.

## 🛑 Core Directives (No Exceptions)

- **Task Mastery:** You MUST use `TaskCreate` to break all research into granular sub-tasks BEFORE starting.
- **Zero Assumption:** You MUST use `AskUserQuestion` at EVERY decision point. User preference > Evidence > AI Defaults.
- **The Power of Three:** You MUST research a minimum of 3 options for every stack layer.
- **Evidence Gate:** Every claim requires `source:link` or `file:line` proof.
- **Confidence Threshold:** Recommendations must include a Confidence Score. (>80% to act; <80% requires verification).

---

## 🛠 The Research Workflow

1. **Load Context:** Read `tangram/overview.md` and all `tangram/studies/*.md` files.
2. **Derive Requirements:** Map business signals (e.g., "Real-time needs") to technical requirements.
3. **WebSearch Standard:** Run minimum 5 queries per layer (Current year benchmarks, Enterprise case studies, Security track records).
4. **Scoring Matrix:** Evaluate options on a 1-5 scale across: **Team Fit (3x), Scalability (3x), Time-to-Market (3x), Ecosystem (2x), and Cost (2x).**

---

## 📋 Deliverable Standard: The Research Report

All findings MUST be written to `tangram/reports/tech-stack-comparison.md` following this exact structure:

### 1. Executive Summary

- **Recommended Stack:** [e.g., Next.js / Supabase / Tailwind]
- **Primary Driver:** [e.g., Scalability vs. Speed]
- **Confidence Level:** [X]%

### 2. Requirements Mapping

| Business Signal      | Technical Requirement                | Priority      |
| :------------------- | :----------------------------------- | :------------ |
| [e.g., Small Budget] | [e.g., Open Source / Low Infra Cost] | [Must/Should] |

### 3. Comparison Matrix (Per Layer)

| Criteria  | Weight | [Option A]          | [Option B] | [Option C] |
| :-------- | :----- | :------------------ | :--------- | :--------- |
| Team Fit  | 3x     | [Score + Rationale] | ...        | ...        |
| **Total** | --     | **[Sum]**           | **[Sum]**  | **[Sum]**  |

### 4. Deep-Dive & Evidence

- **Pro/Con:** List 3 pros and 2 cons per option with cited evidence.
- **Production Proof:** List 2-3 real-world companies using the recommended option.

### 5. Proposed Architecture Diagram (Mermaid)

- Provide a `mermaid` graph showing the data flow between the chosen layers.

---

## 🗣 User Validation Interview

You are FORBIDDEN from finalizing the stack without an `AskUserQuestion` interview (5-8 questions) covering:

1. Recommendation confirmation per layer.
2. Risk tolerance (accepting the "cons" of the chosen stack).
3. Budget/Timeline alignment.

**Final Action:** Once user confirms, move finalized decisions to `tangram/design/stack.md`.
