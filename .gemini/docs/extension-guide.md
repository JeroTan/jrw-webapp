# Tangram Extension Hooks Guide

The Extension Hooks system allows you to inject custom scripts or commands into the Tangram workflow dynamically. This means you can run custom terminal scripts or pass extra context before/after any Tangram command without having to edit the core `.toml` prompt files.

## How it Works

Create an `extensions.yml` file in your `.gemini` directory (or project root, depending on your setup) to define actions that should run *before* or *after* specific Tangram commands.

## Schema Format

```yaml
hooks:
  before_execute:
    - name: "Database Check"
      command: "./scripts/check-db.sh"
      description: "Ensure the database container is running before executing code changes."
      optional: false

  after_plan:
    - name: "Lint Plan"
      command: "npm run lint:markdown"
      description: "Format the markdown plan to match project standards."
      optional: true
```

## Supported Hook Points

You can hook into any Tangram command using the following naming convention:
- `before_<command_name>` (e.g., `before_plan`, `before_agenda`, `before_execute`)
- `after_<command_name>` (e.g., `after_setup`, `after_complete`, `after_constitution`)

## Fields Explained

- `name`: A short identifier for the hook.
- `command`: The exact terminal command or script to execute.
- `description`: A brief explanation of what the hook does. This provides context to the AI so it understands *why* the script is being run.
- `optional`: (Boolean) 
  - If `true`, the AI will ask for your permission before running the command. 
  - If `false`, it runs automatically as a mandatory step.
