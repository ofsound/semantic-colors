# Agent Execution Protocol: Svelte & Supabase

## 1. Boot Sequence

- **Scan:** Read all `.cursor/rules/*.mdc` before first output.
- **Tooling:** Use `svelte` MCP server for all Svelte 5 (Runes) logic.
- **Validation:** Run `svelte-autofixer` before finalizing. **Block task completion** until return is clean.

---

## 2. Reasoning & Constraints

### A. Think Before Coding

- **Surface Tradeoffs:** State assumptions explicitly. If 2+ interpretations exist, **ask**; do not guess.
- **Halt on Ambiguity:** If a request is unclear, name the confusion and stop.
- **Senior Dev Filter:** If a solution is 200 lines and could be 50, **rewrite it.** No speculative abstractions.

### B. Surgical Implementation

- **Strict Scope:** Change only what is requested.
- **No Side Effects:** Do not "improve" or refactor adjacent code, comments, or formatting.
- **Style Match:** Mirror existing patterns, even if suboptimal.
- **Orphan Policy:** Remove imports/variables/functions rendered unused by _your_ changes. Leave pre-existing dead code alone.

### C. Goal-Driven Loop

1. **Reproduce:** Write/run a test or define a specific failure state.
2. **Execute:** Implement the minimum code to solve the problem.
3. **Verify:** Confirm success criteria (e.g., "Invalid input returns 400").

---

## 3. Tech Stack Specifics

- **Svelte 5:** Use Runes (`$state`, `$derived`, `$props`) exclusively. No Svelte 3/4 legacy syntax.
- **Supabase:** Prioritize Supabase Skills (supabase-postgres-best-practices) and MCP reference and usage whenever possible.
- **Tailwind:** Follow project-specific utility class ordering.

---

**Status:** Protocol Active. Awaiting task.
