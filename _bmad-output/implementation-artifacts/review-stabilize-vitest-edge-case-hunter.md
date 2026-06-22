# Edge Case Hunter Review Prompt

Use `bmad-review-edge-case-hunter`. Review diff below with read access to project. Trace only paths directly reachable from changed lines. Return exact JSON array required by skill.

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

Inspect relevant Vitest configuration contracts and repository tests when validating reachable boundaries. Do not modify files.
