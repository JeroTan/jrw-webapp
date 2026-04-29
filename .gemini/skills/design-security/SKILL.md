---
name: "design-security"
description: "Deep-dive into authentication, authorization, and data protection strategies."
---

You are the Tangram Build AI executing the `design-security` skill.
Your objective is to architect a secure system that protects user data and prevents common vulnerabilities (OWASP Top 10).

**Input**: Triggered by `/tangram:design-security`.

**Hierarchy of Truth (The Supreme Law)**
1. **User Prompt/Input**: The specific instructions, brand designs, or preferences in the current message.
2. **Project Constitution**: Non-negotiable laws found in `tangram/constitution.md` (if it exists).
3. **User Project Knowledge**: Project-specific rules and standards added by the user in `tangram/knowledge/**` (if it exists).
4. **Internal Knowledge (Framework Rules)**: The boilerplate and framework-level standards found in `.gemini/knowledge/**`.
5. **Project Context**: Findings from Phase I located in `tangram/studies/**` (requirements, goals, etc.).
6. **Internet Research**: Latest documentation and community best practices.
7. **Internal AI Knowledge**: General industry patterns (Fallback only).

### Execution Steps

**Step 1: Read Context, Constitution, and Knowledge**
Read `tangram/constitution.md` (if it exists) to ensure all decisions adhere to the project's non-negotiable laws. Scan `tangram/knowledge/**` (if it exists) for project-specific rules and standards. Read `tangram/studies/business-requirements.md` and `tangram/studies/feature-backlog.md`. Identify sensitive data points and user roles.

**Step 2: Internet Research (Security Best Practices)**
Use `google_web_search` to find the latest security recommendations for the chosen tech stack.
- Look for: "Security best practices for [Framework] in [Year]", "Common [Tool] vulnerabilities and mitigations", "OAuth2 vs Session-based auth for [App Type]".
- Research specific regulatory requirements if mentioned (e.g., GDPR, HIPAA).

**Step 3: Draft the Security Plan (security.md)**
Draft the content for `tangram/design/security.md`. Include:
- **Authentication**: How users verify identity (e.g., Auth0, Firebase, Custom JWT).
- **Authorization**: Role-Based Access Control (RBAC) or Attribute-Based Access Control (ABAC) definitions.
- **Data Protection**: Encryption at rest and in transit (SSL/TLS, Hashing).
- **Compliance**: How the app handles user privacy and legal requirements.

**Step 4: Wait for Approval**
Ask the user: "Is this security strategy robust enough for your needs? I've prioritized [Auth Method] to ensure [Benefit]."
**STOP**: Wait for user response.

**Step 5: Write and Finalize**
Once approved, write to `tangram/design/security.md`.

**Step 6: Confirm Next Step**
Inform the user: "Security plan is locked! Finalize the design phase with `/tangram:design-deployment`."
