# Debug Session 014: Global API Information

This debug session addresses the user's instruction to add root-level API metadata to the OpenAPI documentation. Instead of using the global config for endpoint or tag documentation (which belongs in the individual route definitions), we will utilize the `openapi()` plugin exclusively for its intended purpose: detailing the overarching version, title, and a comprehensive description of what the entire API is, its purpose, and the architectural principles behind it.

## Fixing Checklist

- [x] task 1 - Define Global API Metadata
  > **Summary:** Update `src/pages/api/[...slug].ts`. Add the `documentation.info` block to the `openapi()` plugin. Include the version ("1.0.0"), the title ("JRW Simple E-commerce API"), and a detailed `description` explaining that this is a high-performance, edge-native e-commerce engine built on Cloudflare Workers, D1, and ElysiaJS, designed around "Technical Brutalist" principles prioritizing speed, simplicity, and zero overselling.
