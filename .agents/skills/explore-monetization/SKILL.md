---
name: "explore-monetization"
description: "Strategize the project's digital revenue model using archetypes like Subscription, Consumption, Data-driven, and Platform Ecosystems. Codex repo skill for the legacy /tangram:explore-monetization workflow."
---

Codex adaptation: this skill was promoted from .codex/workflows/tangram/skills/explore-monetization. Use it explicitly as $explore-monetization, or ask for the matching Tangram workflow in natural language. Internal Tangram knowledge has been mirrored to .agents/knowledge.

You are the Tangram Build AI executing the `explore-monetization` skill.
Your goal is to define a sophisticated financial framework that aligns with digital transformation standards and document it in `tangram/studies/monetization.md`.

**Input**: Triggered by `/tangram:explore-monetization`. The user may specify a basic idea (e.g., "We want to charge per user") or a complex ecosystem vision. It may also be that this is just a free app.

### Steps

1. **Read Context**
   Read `tangram/overview.md` and `tangram/studies/goal.md`. The strategy must align with the target audience and project objectives.

2. **Detect the "Free" Path (The Passion Project Bypass)**
   Ask the user: "Is this a commercial product intended for revenue, or is it a **Free/Internal/Open-Source** project?"
   - **IF FREE/INTERNAL:** Announce: "Documenting as a Free/Internal project. We will focus on sustainability and value delivery rather than revenue capture." Skip to **Step 5** using the **Sustainability Template**.
   - **IF COMMERCIAL:** Proceed to **Step 3**.

3. **Identify the Monetization Archetype**
   For commercial projects, ask the user to select from the Digital Monetization Playbook:
   - **Subscription:** Recurring revenue/LTV focus.
   - **Consumption/Usage-based:** Pay-as-you-go (e.g., per API call).
   - **Data-driven:** Indirect monetization through insights.
   - **Platform Ecosystem:** Multi-sided market/Network effects.

4. **Assess Value Creation vs. Value Capture**
   Discuss how the app will balance user engagement with financial governance (e.g., "Will ads disrupt the UX?").

5. **Suggest the Draft**
   Generate a draft for `tangram/studies/monetization.md` based on the chosen path.
   _Do not write the file yet._ Just show the suggested content.

6. **Wait for Approval**
   Ask: "Does this accurately reflect our financial or sustainability strategy?"
   Pause and wait for the user's response.

7. **Summarize and Write**
   Once approved, write the finalized content to `tangram/studies/monetization.md`.
   Announce that the strategy is locked.

8. **Confirm Next Step**
   Inform the user: "Sustainability strategy locked! Exploration phase complete. We are now ready for the `/tangram:design` phase."

---

### Draft Template: COMMERCIAL (Revenue-Focused)

```markdown
# Digital Monetization Playbook

## 1. Monetization Archetype

- **Model:** [Subscription, Consumption, Data-driven, Platform.]
- **Capture Mechanism:** [e.g., Stripe, In-App Purchases, AdMob.]

## 2. Value Exchange

- **Creation:** [Primary benefit for the user.]
- **Capture:** [How we convert that benefit into revenue.]

## 3. Growth Levers

[e.g., API monetization, Embedded Finance, Dynamic Pricing.]
```
