# Astro Cloudflare Worker Setup Skill

This repository contains an AI Agent Skill designed to scaffold a comprehensive [Astro JS](https://astro.build/) project optimized for [Cloudflare Workers](https://workers.cloudflare.com/). It is the perfect choice for developers building full-stack applications with Astro who want a seamless deployment to Cloudflare while following rigorous architectural standards.

This skill can be used by any AI agent or coding assistant (like Cursor, Claude, or GitHub Copilot) to execute the workflow.

It sets up an advanced, production-ready environment featuring Durable Objects, Elysia API, D1 databases, and enforces a robust Domain-Driven Design (DDD) architecture.

## Features

- **Astro Setup:** Quickly initializes an Astro project with the Cloudflare adapter.
- **Cloudflare Native:** Configures the worker entry point out of the box to handle fetch requests, queues, and scheduled events.
- **Advanced Architecture:** Scaffolds a Domain-Driven Design (DDD) structure.
- **API Integration:** Sets up references for an Elysia API with CORS and OpenAPI.
- **Durable Objects & WebSockets:** Includes guides and setup references for Durable Objects and WebSockets.
- **Styling:** Pre-configures Tailwind CSS.
- **Testing & SEO:** Includes Vitest for testing and Astro Sitemap for SEO.

## Installation

You can easily install this skill globally for your AI agents using the [Agent Skills](https://skills.sh/) CLI. Run the following command in your terminal:

```bash
npx skills add JeroTan/astro-js-cloudflare-worker-skill
```

## Agent Workflow

When this skill is activated by an AI agent, it will guide you through a structured setup:

1. **Initialization:** Scaffolds the base Astro project using `npm create astro@latest`.
2. **Dependencies:** Installs required adapters (`@astrojs/cloudflare`, `@astrojs/check`), utilities (`lodash`, `p-queue`, `jose`), styling tools (`tailwindcss`, `@tailwindcss/vite`), and testing frameworks (`vitest`). Optionally adds React support.
3. **Configuration:** Automatically updates `astro.config.mjs` and Vite settings to support the Cloudflare environment.
4. **Worker Entry Point:** Creates a custom worker entry point (`src/cloudflare/worker.ts`).
5. **Advanced Scaffolding:** Consults reference files to implement:
   - Wrangler and Database configuration
   - Durable Objects
   - Elysia API routing
   - UI Layouts and theming
   - Domain-Driven Design file structure

## Repository Structure

- `SKILL.md`: The core instructions and workflow for the AI agent.
- `references/`: Detailed reference guides for specific architectural components used by the agent during setup:
  - `wrangler-config.md`: Wrangler configuration and database setup.
  - `durable-objects.md`: Durable Objects and WebSockets setup.
  - `ddd-architecture.md`: Domain-Driven Design architecture and folder structure.
  - `elysia-api.md`: Elysia API setup with CORS and OpenAPI.
  - `layouts.md`: Layouts and theming setup.

## Requirements

- [Node.js](https://nodejs.org/)
- An AI Agent / CLI Assistant
- Cloudflare account (for deployment)
