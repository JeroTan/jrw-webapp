# Git Commit Rules (Conventional Commits 1.0.0)

**Format Structure:**
```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

## Structural Elements
1. **Type (Required):** The category of the change (see Allowed Types below).
2. **Scope (Optional):** A noun describing the section of the codebase, enclosed in parentheses (e.g., `feat(auth):`).
3. **Description (Required):** A short summary of the code changes. Must use imperative, present tense ("change" not "changed" or "changes"), be lowercase, and have no trailing period.
4. **Body (Optional):** Contextual information about the changes. Must begin one blank line after the description. Free-form, can be multiple paragraphs.
5. **Footer (Optional):** Must begin one blank line after the body. Used for referencing issues (e.g., `Refs: #123`) or noting breaking changes.

## Allowed Types
- `feat`: Introduces a new feature (correlates with MINOR version bump).
- `fix`: Patches a bug (correlates with PATCH version bump).
- `refactor`: A code change that neither fixes a bug nor adds a feature.
- `test`: Adding missing or correcting existing tests.
- `docs`: Documentation only changes.
- `chore`: Maintenance, tool configuration, or dependency updates.
- `style`: Formatting changes (spaces, commas, missing semi-colons, etc).
- `perf`: A code change that improves performance.
- `build`: Changes affecting the build system or external dependencies.
- `ci`: Changes to CI configuration files and scripts.

## Breaking Changes (MAJOR version bump)
Must be indicated in one of two ways:
1. Appending a `!` immediately before the colon in the prefix (e.g., `feat(api)!: drop v1 endpoints`).
2. Including `BREAKING CHANGE:` followed by a description as a footer at the bottom of the commit message.

**AI Instruction:** When drafting commit messages, ALWAYS strictly adhere to this format. Use the Body section if the commit logic is complex and requires explanation beyond the 50-character description limit.