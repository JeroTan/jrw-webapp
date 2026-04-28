# Architecture & Folder Structure

- Scaffold a bulletproof/DDD architecture in `src/`:
  - `components`, `assets`, `features`, `hooks`, `lib`, `stores`, `styles`, `test`, `types`, `utils`
  - Astro folders: `actions`, `i18`, `layouts`, `middleware`, `pages`
  - DDD folders: `domain`, `adapter/application`, `adapter/infrastructure` (services go here)
  - Backend/Elysia: `api/routes`, `api/config`, `controller`, `container`
  - Cloudflare: `cloudflare`

- **\_README.md**: Add a `_readme.md` in each folder explaining its purpose.
- **Vitest Setup**: In the `test` folder, create a `readme.md` providing a quick guide on how to write and run unit tests.
- **i18n**: Copy the `i18` folder 1:1 from the reference codebase, including `src/test/i18/**` for sample tests.
- **Utils**: Copy `src/utils/api/query.ts` as-is. Ensure any type references (like `@/types/model/filter`) are either copied or integrated into the file.
- **Libraries**: If the user provides reference files for `durableObjects.ts`, `elysia.ts`, `formatter.ts`, `crypto/**`, or `query.ts`, copy them to the new project structure to retain helper patterns.
- **Services**: Implement logic in `adapter/infrastructure` as services that wrap the domain for use by controllers or clients.
- **Containers**: Use `container` to wrap the backend design (Dependency Injection).
