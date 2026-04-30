# Debug Session 005: Refactor TypeBox Utilities to src/lib/typebox

This debug session addresses the architectural inconsistency where TypeBox wrappers are stored in the domain layer, while Zod wrappers have a dedicated `src/lib/zod` folder.

## Fixing Checklist

- [x] task 1 - Migrate TypeBox Wrappers to `src/lib/typebox`
  > **Summary:** Created `src/lib/typebox/wrappers.ts` and moved TypeBox-specific API wrappers and utility functions (like `tboxEnum`) there. Updated `src/domain/validation/shared.ts` and all domain validation files to reference the new library path. This ensures architectural symmetry between the Zod and TypeBox library implementations.
