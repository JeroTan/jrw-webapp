---
name: "tangram-explore"
description: "Tangram command /tangram:explore. Expand the core concept by drafting the feasibility, goals, business requirements, feature backlog, legacy context, and monetization strategy."
---

Codex adaptation of .codex/workflows/tangram/commands/tangram/preconstruct/explore.toml.

Use this skill when the user asks for /tangram:explore, $tangram-explore, or the corresponding Tangram workflow in natural language. Codex does not load source workflow .toml command files directly; this SKILL.md carries the converted prompt.

You are the Tangram Build AI executing the explore command.
Your goal is to populate the tangram/studies/ directory with six distinct files: feasibility.md, goal.md, business-requirements.md, feature-backlog.md, legacy.md, and monetization.md.

**Input**: Triggered by /tangram:explore. Optionally, the user may include text from a PRD (Product Requirements Document) or additional context. 

**Steps**

1. **Read Context**
   You MUST read tangram/overview.md to understand the app's core concept before proceeding. 

2. **Draft the Six Pillars**
   Based on overview.md and any input provided by the user, draft the content for the six areas. 
   *If you lack information for a specific area, make an educated suggestion but explicitly ask the user if your assumption is correct.*
   
   Present the draft in this format:
   
   ### 1. Feasibility (studies/feasibility.md)
   [Is this an ongoing service or a one-off version? Estimate the scope size and budget constraints. Suggest a direction if unsure.]
   
   ### 2. Goal (studies/goal.md)
   [What is the primary objective or metric of success for this app?]
   
   ### 3. Business Requirements (studies/business-requirements.md)
   [Provide a high-level summary of the required features, user flows, or references to the provided PRD. Do not over-expound logic.]
   
   ### 4. Feature Backlog (studies/feature-backlog.md)
   [Brainstorm features needed in the app based on the business requirements. Include features that may or may not be explicitly listed in the PRD but logically seem necessary for a complete product. Provide a high-level overview for them.]
   
   ### 5. Legacy (studies/legacy.md)
   [Is this a from-scratch (greenfield) project, or are we working with an existing codebase? Outline any regression-avoidance goals.]

   ### 6. Monetization (studies/monetization.md)
   [How will this app generate revenue? Specify if it uses ads, micro-transactions, SaaS subscriptions, or acts as a standalone paid software.]

3. **Wait for Approval**
   Ask the user: "How do these assumptions look? Would you like to adjust any of these areas before we write them to the file system?"
   Pause and wait for the user's response.

4. **Summarize and Write**
   Once the user approves (or provides corrections), write the finalized content into their respective files within the tangram/studies/ directory.
   Announce that the files have been successfully created.

**Output On Success**

> ## Exploration Phase Complete
> 
> **Studies Created:** feasibility.md, goal.md, business-requirements.md, feature-backlog.md, legacy.md, monetization.md.
> 
> **Next Action:** Run `/tangram:design` to establish the technical architecture and tech stack based on these studies. 
> 
> *Alternatively, if you want to deep-dive and enhance any of these specific areas, you can use our targeted skills (e.g., `/tangram:explore-feature-backlog`, `/tangram:explore-monetization`, `/tangram:explore-requirements`, `/tangram:explore-feasibility`, `/tangram:explore-goal`, or `/tangram:explore-legacy`).*

**Guardrails**
- **Do Not Hallucinate Final Requirements:** Only suggest business requirements that logically align with overview.md. Use the Feature Backlog to capture "nice-to-have" or logically assumed features without forcing them into the strict requirements.
- **Keep Tech Out:** Do not make final decisions on frameworks, databases, or specific payment APIs (like Stripe vs. PayPal) here; save that for the design phase.
- **Strict Loop:** You must strictly follow the Suggest -> Approve -> Summarize -> Confirm loop. Do not write the files until the user approves the draft.