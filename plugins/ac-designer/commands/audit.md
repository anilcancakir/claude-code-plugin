---
description: Cross-page design consistency audit — scans all page HTML, extracts tokens, compares across pages and against DESIGN.md Token Reference. Reports drift matrix with category-level summary. Advisory only.
argument-hint: Optional page name to audit single page (omit for full project audit)
---

# Cross-Page Design Consistency Audit

You are running a retrospective design consistency audit across all generated pages in a Stitch project. Extract tokens from every page HTML, compare them against each other and against the DESIGN.md Token Reference, and present a drift matrix with actionable findings. This command is purely advisory — it reads and reports but NEVER modifies files.

Load `${CLAUDE_PLUGIN_ROOT}/skills/prompt-engine/SKILL.md` for all referenced procedures.

## Core Principles

- **Advisory only**: This command reads and reports — it NEVER modifies files. No write tools. Present findings as information, not gates
- **Token Reference is truth**: All comparisons anchor against `.stitch/DESIGN.md` `## Token Reference` section — this is the declared design contract
- **Category-level summary first**: Show "Colors: 2 drift / Typography: clean / ..." before the full matrix. Users need the overview before details
- **Non-blocking**: Present findings as information, not gates. User decides what to fix
- **Reference, don't duplicate**: Invoke Cross-Page Drift Detection by procedure name from prompt-engine — do not re-implement extraction or comparison logic here

---

## Phase 1: Preflight

**Goal**: Validate prerequisites and collect all page HTML files for audit

**Actions**:

1. Check `.stitch/metadata.json` exists — if not, error: "Run `/ac-designer:init` first"
2. Check `.stitch/DESIGN.md` exists — if not, error: "Run `/ac-designer:init` first to establish design foundation"
3. Load `.stitch/DESIGN.md` — verify the `## Token Reference` section exists. If missing, error: "DESIGN.md is missing Token Reference section. Re-run `/ac-designer:init` to regenerate with v2 format."
4. Scan `.stitch/designs/pages/*.html` — collect all page HTML file paths
5. If no HTML files found: error: "No pages found. Generate pages first via `/ac-designer:page` or `/ac-designer:designer`"
6. Load `metadata.json` — extract screen entries with `type: "page"` for page name mapping
7. Parse `$ARGUMENTS`:
   - **Page name provided**: Filter to that single page HTML only. If the page HTML does not exist in `.stitch/designs/pages/`, error: "Page `{name}` not found in `.stitch/designs/pages/`. Available pages: {list}"
   - **No argument**: Audit all collected page HTML files (full project audit)
8. Present scan summary: "Found N pages to audit: {page-name-list}"

---

## Phase 2: Cross-Page Audit

**Goal**: Extract tokens from all pages and build drift matrix against Token Reference

**Actions**:

1. Run **Cross-Page Drift Detection** procedure from prompt-engine (`references/drift-detection.md`):
   - Input: all collected page HTML file paths from Phase 1
   - Extracts tokens from each page HTML using the **Extraction Rules** in `references/design-tokens-v2.md` — handles all three forms: inline styles, Tailwind arbitrary-value classes, named Tailwind utilities
   - Loads `## Token Reference` from `.stitch/DESIGN.md` as baseline expected set
   - Builds drift matrix comparing each page against Token Reference and against each other
   - Assigns status per token per page: `✓` MATCH, `~` NEAR_MATCH, `✗` DRIFT, `—` MISSING
2. Build category-level summary line for each token category (Colors, Typography, Geometry, Spacing, Shadows):
   - Format: "Colors: N tokens drift across M pages | Typography: clean | Geometry: N drift | Spacing: clean | Shadows: clean"
   - A category is "clean" when all tokens across all pages are MATCH or NEAR_MATCH
3. If single-page mode (`$ARGUMENTS` was a page name): run **Per-Page Drift Detection** procedure instead of Cross-Page — produces a per-token table with Expected vs Actual columns for that single page

---

## Phase 3: Report

**Goal**: Present findings in a structured, actionable format

**Actions**:

1. Present category-level summary FIRST — one line per category:
   ```
   ## Audit Summary
   - Colors: 2 tokens drift across 1 page
   - Typography: clean
   - Geometry: 1 token drift across 2 pages
   - Spacing: clean
   - Shadows: clean
   ```

2. Present the full drift matrix table per category — ONLY categories with drift (skip clean categories):
   ```
   ### Colors
   | Token | DESIGN.md | home | settings | profile | Consensus |
   |-------|-----------|------|----------|---------|-----------|
   | Primary | #3B82F6 | #3B82F6 ✓ | #3B82F5 ~ | #2563EB ✗ | 2/3 match |
   | Border | #334155 | #334155 ✓ | — ✗ | #334155 ✓ | 2/3 match |
   ```

3. Present actionable suggestions per drifting token:
   - **Specific pages drift** (minority): "Fix `{page-name}` via `/ac-designer:page {page-name}` then request changes targeting the drifting tokens"
   - **Majority drift** (>50% of pages consistently use a different value): "**Possible DESIGN.md staleness** — majority of pages use {actual value} instead of {expected value}. Consider re-running `/ac-designer:init` to regenerate design tokens from current state"
   - **MISSING tokens**: Note which pages lack the token — may be expected if the page does not use that design element (e.g., no destructive actions → no destructive color)
   - **EXTRA tokens**: Flag undeclared tokens found in pages — may indicate design evolution not yet captured in DESIGN.md

4. If single-page mode (`$ARGUMENTS` was a page name): present Per-Page drift table instead of cross-page matrix:
   ```
   ### Colors — {page-name}
   | Token | Expected | Actual | Status |
   |-------|----------|--------|--------|
   | Primary | #3B82F6 | #3B82F5 | NEAR_MATCH |
   | Surface | #1E293B | #2D3748 | DRIFT |
   ```

5. End with completion summary: "Audit complete. N tokens audited across M pages. {drift-count} drifting."

---

## Error Recovery

- **No HTML files in `designs/pages/`**: Inform user to generate pages first — "No pages found. Generate pages first via `/ac-designer:page` or `/ac-designer:designer`"
- **DESIGN.md missing Token Reference section**: Error — "DESIGN.md is missing Token Reference section. Re-run `/ac-designer:init` to regenerate with v2 format."
- **Single page argument not found**: "Page `{name}` not found in `.stitch/designs/pages/`. Available pages: {list}"
- **Empty Token Reference**: If `## Token Reference` section exists but contains no tables — "Token Reference section is empty. Re-run `/ac-designer:init` to extract tokens from generated screens."
- **All pages clean**: Present the clean summary and confirm — "All tokens consistent across all pages. No drift detected."
