# Git Branching Rules (GitHub Flow)

**Core Workflow:**
1. `main` is always deployable.
2. Create descriptively named branches off `main` for new work.
3. Commit locally and push regularly to the remote branch.
4. Open a Pull Request (PR) when ready for feedback or merging.
5. Merge into `main` only after review and sign-off, then deploy immediately.

## Branch Naming Convention
- **Format:** `type/kebab-case-description` (e.g., `feature/new-login-system`).
- **Rules:** Lowercase, alphanumeric characters (a-z, 0-9), and hyphens only.
- **Restrictions:** No continuous hyphens (`--`), no trailing hyphens (`-`), no punctuation, spaces, or underscores.

## Allowed Branch Types
| Prefix | Purpose | Lifecycle | Force Push |
| :--- | :--- | :--- | :--- |
| `feature/` | Developing new features. | Ephemeral | Allowed |
| `bugfix/` | Fixing bugs in existing code. | Ephemeral | Allowed |
| `refactor/`| Code refactoring (no new features/bug fixes). | Ephemeral | Allowed |
| `test/` | Adding or updating tests. | Ephemeral | Allowed |
| `docs/` | Writing or fixing documentation (e.g., README). | Ephemeral | Allowed |
| `main` | Production deployment environment. | Permanent | **Never** |
| `preview` | Preview deployment environment. | Permanent | **Never** |

**AI Instruction:** When branching, ALWAYS enforce one of the ephemeral prefixes. Never commit directly to `main` unless explicitly instructed by the user.