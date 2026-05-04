---
name: "tangram-setup"
description: "Tangram command /tangram:setup. Initialize the project environment and folder hierarchy based on the approved Design pillars and templated setup knowledge."
---

Codex adaptation of .codex/workflows/tangram/commands/tangram/preconstruct/setup.toml.

Use this skill when the user asks for /tangram:setup, $tangram-setup, or the corresponding Tangram workflow in natural language. Codex does not load source workflow .toml command files directly; this SKILL.md carries the converted prompt.

Initialize the project environment and generate the base file structure using a tool-first, streamlined approach.

**Input**: Triggered by `/tangram:setup`. 

**Hierarchy of Truth**
1. **The User Prompt**: Direct instructions in the current message take absolute precedence.
2. **User Project Knowledge**: Templated setup rules and boilerplate standards found in `.agents/knowledge/setup/**`.
3. **Design Pillars**: Core requirements in `tangram/design/structure.md` and `tangram/design/stack.md`.

**Steps**

1. **Pre-execution Dynamic State Check (Safety Net)**
   - Read the core technology stack from `tangram/design/stack.md`.
   - Run system commands to verify required tools based on the stack (e.g., `node -v`, `python --version`, `git status`).
   - If a required tool is missing, **STOP** and alert the user to install it before proceeding.
   - Dynamically create essential ignore files (e.g., `.gitignore`, `.dockerignore`, `.eslintignore`) based on the detected tech stack.

2. **Tool-First Discovery & Online Research (The "Headstart" Scan)**
   - Identify the core technology stack from `tangram/design/stack.md`.
   - **Research Phase**: Search specifically for "Getting Started" CLI commands, official "Headstart" scripts, or "Component Initialization" tools (e.g., `npx create-next-app`, `npm init`, `shadcn-ui init`, `python -m venv`, `cargo init`).
   - Determine if there is a modern, community-recommended shortcut to automate the environment and foundational folder creation.

3. **Deep Knowledge Scan & Synthesis**
   - Read `tangram/design/structure.md`.
   - Check `.agents/knowledge/setup/**` for internal boilerplate standards that must be applied *after* the initial tool-driven setup.

4. **Safety Scan (No Blind Overwrites)**
   - Scan the root directory. If folders already exist:
   - Use **AskUserQuestion**: "Existing project structure detected. Should I (A) Only add missing folders/files or (B) Perform a clean reset (WARNING: Data loss)?"
   - **STOP**: Wait for user response.

5. **Streamlined Execution (CLI-Driven)**
   - Propose the specific "Getting Started" or "Headstart" command found in Step 1.
   - Execute the command to generate the foundational environment, configuration files (`package.json`, `requirements.txt`), and base dependencies.

6. **Manual Orchestration & Augmentation**
   - Once the standard CLI/Headstart setup is complete, "orchestrate from scratch" any remaining custom folders or files (like the `tangram/` hierarchy) that the automated tools did not create.
   - Ensure the `tangram/features/` directory is correctly initialized.

7. **Boilerplate & Config Refinement**
   - Generate "Foundation Files" using specific logic found in `knowledge/setup/**`:
   - **Standard Configs**: Merge or update generated configs (e.g., `tsconfig.json`, `Dockerfile`, `.gitignore`) with Tangram-specific rules.
   - **Environment**: Create `.env.example` with standard keys.

8. **Wait for Approval**
   - Display the resulting directory tree and list the CLI tools and templates applied. 
   - Ask: "The project skeleton is ready via [Command Name]. Should I finalize the creation and install any remaining dependencies?"
   - **STOP**: Wait for user response.

9. **Finalize & Dependency Sync**
   - Execute any final file writes.
   - Run the final package manager commands (e.g., `npm install`, `pip install`, `yarn install`, `cargo build`) to ensure the environment is fully locked and ready.

**Output On Success**

> ## Project Setup Complete
> 
> **Headstart Command:** <e.g., npx create-next-app / shadcn-ui init>
> **Templates Applied:** <Name of Template from knowledge/setup/** or 'Custom'>
> **Target Structure:** Aligned with design/structure.md + Setup Knowledge.
> 
> **Initialized Items:**
> - Base skeleton (Streamlined via Online Research & CLI)
> - Custom Folder Orchestration (Completed)
> - Standard Boilerplate (.gitignore, README, Configs)
> - Dependency Skeletons & .env.example
> - All base dependencies installed successfully
> 
> **Next Action:** Your workspace is ready. Run `/tangram:agenda` to define the requirements for your first feature.

**Guardrails**
- **Priority**: Always prefer an official "Getting Started" CLI or "Headstart" script over manual folder creation.
- **Traceability**: Always cite the specific CLI command or online resource that influenced the structure.
- **Strict Loop**: Search -> Propose -> Execute Headstart -> Orchestrate Extras -> Confirm.