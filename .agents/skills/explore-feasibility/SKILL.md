---
name: "explore-feasibility"
description: "Deep-dive into the project's feasibility, analyzing implementation options, technical constraints, risks, and validation strategies. Codex repo skill for the legacy /tangram:explore-feasibility workflow."
---

Codex adaptation: this skill was promoted from .codex/workflows/tangram/skills/explore-feasibility. Use it explicitly as $explore-feasibility, or ask for the matching Tangram workflow in natural language. Internal Tangram knowledge has been mirrored to .agents/knowledge.

You are the Tangram Build AI executing the `explore-feasibility` skill.
Your goal is to expand the high-level feasibility summary into a comprehensive, industry-standard study within `tangram/studies/feasibility.md`.

**Input**: Triggered by `/tangram:explore-feasibility`. Optionally, the user may include specific constraints or preferred implementation methods (e.g., `/tangram:explore-feasibility We have 3 months and must integrate with Salesforce`).

### Steps

1. **Read Context**
   You MUST read `tangram/overview.md` to understand the app, and the current `tangram/studies/feasibility.md` (if it exists) to see the baseline assumptions.

2. **Assess Missing Variables (Question Mode)**
   To build a rigorous feasibility study, you need to understand the boundaries. Ask the user 1 or 2 targeted questions before drafting.
   _Examples:_ "Are we open to using off-the-shelf/SaaS solutions for some features, or must this be a 100% custom build?" "What is the primary constraint: budget, timeline, or performance?" "Are there existing legacy systems we must integrate with?"
   Wait for their response.

3. **Suggest the Draft**
   Using the context and the user's constraints, generate a detailed draft for `tangram/studies/feasibility.md` using the professional template below.
   _Do not write the file yet._ Just show the suggested content.

4. **Wait for Approval**
   Ask: "Does this accurately reflect our constraints, risks, and recommended implementation path?"
   Pause and wait for the user's response.

5. **Summarize and Write**
   Once the user approves (or requests tweaks), overwrite `tangram/studies/feasibility.md` with the finalized content.
   Announce that the feasibility study has been successfully expanded.

6. **Confirm Next Step**
   Inform the user: "Feasibility deep-dive complete! You can continue exploring other areas (like `/tangram:explore-requirements`), or move forward to the `design` phase."

---

### Draft Template for tangram/studies/feasibility.md

```markdown
# Comprehensive Technical Feasibility Study

## 1. Executive Summary

[A concise summary stating whether the project is highly feasible, conditionally feasible (with risks), or at risk based on the given constraints.]

## 2. Current Diagnosis & Scope

[Briefly describe the current state (e.g., greenfield project vs. replacing a legacy system) and the overarching scope of what needs to be built.]

## 3. Implementation Options

[Analyze the potential development paths:

- **Option A:** Off-the-shelf/SaaS integration (if applicable).
- **Option B:** Custom development.
- **Option C:** Hybrid approach.]

## 4. Recommended Technical Approach

[Draft a high-level architectural blueprint for the recommended option. Mention the required types of databases, third-party API integrations, and security measures. *Note: Keep it framework-agnostic; save specific technologies for the Design phase.*]

## 5. Financial & Resource Feasibility

[Outline the budget constraints. Mention potential ongoing costs like cloud cloud hosting, API usage, SaaS licensing, and required developer skillsets.]

## 6. Timeline & Roadmap

[Evaluate the time required vs. the deadline. Suggest a phased release approach to manage scope effectively.]

## 7. Risk Assessment

[List 3-4 potential technical risks (e.g., scalability issues, third-party dependency failures, maintenance overhead, lack of available experts) and provide a mitigation strategy for each.]

## 8. Proposed Feasibility Testing

[Recommend the best way to validate this concept before full-scale development: e.g., **Proof of Concept (PoC)** for testing a technical unknown, **Prototype** for UI/UX validation, or an **MVP** for market validation.]
```
