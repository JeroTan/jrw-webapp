# Acceptance Auditor Review Prompt

Review implementation without conversation context. Read:

- `_bmad-output/implementation-artifacts/spec-stabilize-vitest-worker-lifecycle.md`
- `_bmad-output/project-context.md`
- `vitest.config.ts`
- `package.json`
- `_bmad-output/implementation-artifacts/5-3-paymongo-payment-creation-and-handoff.md`

Audit diff below against every acceptance criterion, frozen boundary, project rule, and verification claim. Report findings as concise Markdown list with severity, location, violated requirement, and required correction. Report `No findings` only when all claims are evidenced. Do not modify files.

```diff
diff --git a/vitest.config.ts b/vitest.config.ts
index 98f2349..37b1f29 100644
--- a/vitest.config.ts
+++ b/vitest.config.ts
@@ -9,6 +9,8 @@ export default defineConfig({
   },
   test: {
     exclude: [...configDefaults.exclude, "tests/qa/**"],
-    fileParallelism: false,
+    fileParallelism: true,
+    maxWorkers: 2,
+    pool: "threads",
   },
 });
```
