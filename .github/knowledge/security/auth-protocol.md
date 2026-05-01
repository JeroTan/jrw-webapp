# OAuth 2.0 & Identity Security Protocol

This document is the **MANDATORY** authority for authentication, authorization, and data security. It enforces IETF Best Current Practices (BCP) to ensure the system is "Secure by Design."

## Core Directives (No Exceptions)

- **Flow Enforcement:** You MUST use **Authorization Code Flow with PKCE** (Proof Key for Code Exchange) for ALL client types (SPA, Mobile, and Web).
- **Implicit Flow Ban:** The Implicit Grant flow is strictly FORBIDDEN due to security vulnerabilities in URL-based token delivery.
- **Least Privilege:** You MUST define "Scopes" and "Claims" based on the principle of least privilege. Never request `*` or administrative access for standard users.
- **Token Hardening:** Refresh tokens MUST implement **Rotation** and **Sender-Constraining** (e.g., DPoP or Mutual TLS) to mitigate token theft risks.
- **Redirect Integrity:** Redirect URIs must be exact matches. Wildcards are strictly PROHIBITED.

---

## The Security Deep-Dive Workflow

### 1. Identity Requirement Mapping

- **Identity Provider (IdP):** Evaluate internal vs. external IdP (e.g., Auth0, Keycloak, Firebase, or Custom).
- **User Personas:** Map roles (Admin, Editor, Viewer) to specific OAuth Scopes.

### 2. The PKCE Standard Implementation

For every authentication request, you must document the implementation of:

- **Code Challenge & Verifier:** Ensuring the authorization code cannot be intercepted and used by a malicious actor.
- **State & Nonce:** Mandatory use of CSRF protection tokens and replay-attack prevention.

### 3. Token Management & Storage

- **Storage Strategy:** Define where tokens live (e.g., Memory-only for SPAs with a Backend-for-Frontend (BFF) pattern, or Secure Enclave for Mobile).
- **Expiration Logic:** Short-lived Access Tokens (5-15 mins) and sliding-window Refresh Tokens.

### 4. API & Data Protection

- **CORS Policy:** Strict origin-based access control.
- **Payload Security:** Ensure sensitive data (PII) is encrypted at rest and in transit (TLS 1.3+).

---

## Deliverable Standard: The Security Blueprint

Write to `tangram/design/security.md` with high-fidelity detail:

### 1. Authentication Architecture

- **Grant Type:** [e.g., Authorization Code + PKCE]
- **Identity Provider:** [e.g., Managed Auth0 / Self-hosted Keycloak]
- **Session Strategy:** [e.g., JWT vs. Opaque Session Cookies]

### 2. Authorization Matrix (RBAC/ABAC)

| Role  | Scopes                  | Access Level       |
| :---- | :---------------------- | :----------------- |
| Admin | `write:all`, `read:all` | Full System Access |
| User  | `read:own`, `write:own` | Personal Data Only |

### 3. Security Hardening Checklist

- [ ] **PKCE Enabled:** (Mandatory)
- [ ] **Refresh Token Rotation:** (Mandatory for public clients)
- [ ] **HSTS & Secure Headers:** (CSP, X-Frame-Options)
- [ ] **Rate Limiting:** Defined for Auth endpoints.

---

## User Validation (The Security Interview)

Ask 5-8 questions via `#tool:vscode_askQuestions`:

1. **Compliance:** "Do we need to adhere to specific standards like GDPR, HIPAA, or PCI-DSS?"
2. **Social Login:** "Which third-party providers (Google, GitHub, Apple) are required?"
3. **MFA Necessity:** "Is Multi-Factor Authentication mandatory for all users or just Admins?"
4. **Session Longevity:** "Should sessions persist indefinitely (Stay logged in) or timeout quickly?"

**Final Action:** Once user confirms, lock the security architecture into `tangram/design/security.md`.
