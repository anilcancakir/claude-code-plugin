---
description: Generate a single page design — selects strategy (full generation or layout-referenced), runs prompt enhancement pipeline with DESIGN.md injection, generates via Stitch, runs consistency check. Run after /ac-designer:init (and optionally /ac-designer:layout).
argument-hint: Page name or description (e.g., "settings page", "user profile")
model: opus
---

# Page Generation

You are orchestrating single-page design generation for a Stitch project. Determine the optimal generation strategy based on project state (full generation, layout-referenced, or in-place edit), run the full prompt enhancement pipeline with DESIGN.md token injection and optional layout constraints, generate via Stitch, verify consistency against codebase context, and iterate to user approval.

Load `${CLAUDE_PLUGIN_ROOT}/skills/prompt-engine/SKILL.md` for all referenced procedures.

## Core Principles

- **Strategy Selection drives everything**: The generation approach depends entirely on whether a layout exists and whether the page is new or existing — get this right before touching Stitch
- **DESIGN.md is the consistency contract**: Every page prompt includes the DESIGN SYSTEM BLOCK section from `.stitch/DESIGN.md` copied verbatim — Gemini receives the exact same token constraints on every page generation
- **Layout Reference preserves chrome**: When a layout exists, the prompt describes ONLY content area changes — layout shell elements (header, tab bar, nav) come from the layout HTML reference
- **Pro for critical, Flash for regular**: GEMINI_3_PRO for hero/landing/dashboard pages, GEMINI_3_FLASH for everything else and all edits
- **Reference, don't duplicate**: Procedures from prompt-engine are invoked by name, not re-implemented here

---

## Phase 1: Preflight

**Goal**: Validate prerequisites and determine page context

**Actions**:

1. Check `.stitch/metadata.json` exists — if not, error: "Run `/ac-designer:init` first to create the Stitch project"
2. Check `.stitch/DESIGN.md` exists — if not, error: "Run `/ac-designer:init` first to establish design foundation"
3. Load `metadata.json` — extract `projectId`, `deviceType`, and existing screens map (separate layouts and pages by `type` field)
4. Parse `$ARGUMENTS`:
   - **Argument provided** (e.g., "settings page", "user profile"): Use as page name and description — proceed to Phase 2
   - **No argument**: Check `.stitch/SITE.md` roadmap for the next pending page (first unchecked `- [ ]` item). If found, confirm with user: "Next pending page is {page-name}. Generate this one?" If no pending pages or no SITE.md, interview user: "Which page should we generate?"
5. Determine page name slug from the description (e.g., "User Profile" → `user-profile`, "Settings Page" → `settings`)

---

## Phase 2: Strategy Selection

**Goal**: Choose the optimal generation approach based on project state

**Actions**:

1. Evaluate the decision matrix:

| Condition | Strategy | Tool | Rationale |
|-----------|----------|------|-----------|
| No layout in metadata.json | Full generation | `generate_screen_from_text` | No layout shell to reference |
| Layout exists, new page | Layout-referenced | `generate_screen_from_text` + Step 7 Layout Reference Injection | DESIGN.md + layout constraints for consistency |
| Editing existing page | In-place edit | `edit_screens` with page screenId | Targeted changes only |

2. **Full generation** (no layout): Proceed directly to Phase 3 — the prompt pipeline runs Steps 1-6 only (Step 7 skipped)
3. **Layout-referenced** (layout exists, new page):
   - Identify which layout applies to this page (from metadata.json or user input)
   - Load layout HTML from `.stitch/designs/layouts/{layout-name}.html` — this feeds Step 7 Layout Reference Injection in the prompt pipeline
   - The prompt will describe ONLY the content area — layout chrome (header, tab bar, nav, sidebar) comes from the layout reference
4. **In-place edit** (existing page):
   - Load the page's screenId from metadata.json
   - Gather user's change description
   - Skip to Phase 3 edit path (no full generation needed)
5. Model routing:
   - **GEMINI_3_PRO**: Critical pages — hero, landing, dashboard, onboarding, any page the user flags as important
   - **GEMINI_3_FLASH**: Regular pages — settings, profile, list views, detail views, forms
   - **GEMINI_3_FLASH**: All `edit_screens` calls (targeted changes, less reasoning needed)
   - **Quota check** (before selecting GEMINI_3_PRO): Read `proUsage` from `.stitch/metadata.json` (`proUsage.count`, `proUsage.monthStart`):
     - If `monthStart` doesn't match the current month (YYYY-MM format) → reset `count` to 0, update `monthStart` to current month, write back to metadata.json
     - If `proUsage.count >= 50`: Override to GEMINI_3_FLASH with warning: "GEMINI_3_PRO monthly limit reached. Switching to GEMINI_3_FLASH."
     - If `proUsage.count >= 45`: Warn user: "Approaching GEMINI_3_PRO monthly limit (~50). Consider using GEMINI_3_FLASH." — user can still choose PRO
6. Present strategy to user for confirmation:
   - "Strategy: {Full generation / Layout-referenced / In-place edit}"
   - "Model: {GEMINI_3_PRO / GEMINI_3_FLASH}"
   - "Layout reference: {layout-name or 'none'}"
   - Options: "Approve" / "Change strategy" / "Change model"

---

## Phase 3: Page Generation

**Goal**: Generate the page with full prompt enhancement and iterate to approval

**Actions**:

1. If user provides a visual reference (screenshot, sketch, mockup):
   - **Pasted image (no file path)** — Claude already sees the image in this context:
     - For basic review: describe the visual reference's design language inline — colors, layout, component styles. Merge into the generation prompt
     - For detailed design tokens: call `mcp__gemini-cli__ask-gemini` with: `Analyze this UI screenshot for design tokens: list all colors with hex values, typography (family, sizes, weights), spacing scale, border radius, shadows, and component styles.` Merge findings into the generation prompt
   - **File path provided**: Spawn ac:gemini-vision subagent with the file path for detailed analysis — merge result into generation prompt
   - **If gemini-cli MCP unavailable**: Analyze inline with Claude — describe visual design language from the visible image
   - After visual analysis (any path): invoke the **Stitch Web Bridge** procedure from prompt-engine — save enhanced prompt to `/tmp/stitch-prompt-{page-name}.md`, present Manual (upload to stitch.withgoogle.com) / Auto (text-only) options
2. Run the **Prompt Enhancement Pipeline** (Steps 1-7 from prompt-engine):
   - Step 1 (Assess Input): Evaluate page description for missing elements
   - Step 2 (Load Design Context): Locate the DESIGN SYSTEM BLOCK section in `.stitch/DESIGN.md` for verbatim copy in Step 6
   - Step 2b (Codebase Context Injection): If source code exists at project root, spawn ac:explore for routes, models, components relevant to this page. Skip for greenfield projects
   - Steps 3-6 (Refine, Inject Principles, Optimize, Format): Build the complete enhanced prompt
   - Step 6b (STYLE ANCHOR Injection): If `.stitch/metadata.json` has a `foundationScreen` entry, append a **STYLE ANCHOR** text directive to the enhanced prompt after the DESIGN SYSTEM BLOCK: "This page MUST match the foundation screen's visual language exactly — same color palette, typography weights, border radii, and component shapes as defined in the DESIGN SYSTEM BLOCK above. Any deviation from these tokens is a bug."
   - Step 7 (Layout Reference Injection): If strategy is "layout-referenced", inject the layout HTML reference block after CRITICAL REMINDER. Skip for "full generation" strategy
3. Generate the page:
   - **Full generation / Layout-referenced**: `generate_screen_from_text` with `projectId` from metadata.json, enhanced prompt, selected `modelId`, and `deviceType` from metadata.json
   - **In-place edit**: `edit_screens` with `projectId`, `selectedScreenIds` containing the page's screenId, and the change prompt. Use GEMINI_3_FLASH
   - **Quota increment**: After every `generate_screen_from_text` or `edit_screens` call that used GEMINI_3_PRO — increment `proUsage.count` in `.stitch/metadata.json` and write back immediately
4. Run **Asset Download Procedure** from prompt-engine — saves HTML + PNG to `.stitch/designs/pages/{page-name}.html` and `.stitch/designs/pages/{page-name}.png`
5. Run **Consistency Check** from prompt-engine — only if Step 2b produced a CODEBASE CONTEXT block. Skip for greenfield projects. Report mismatches as warnings — user decides whether to address them
6. Run **Drift Detection** from prompt-engine (Per-Page procedure) on the generated page HTML at `.stitch/designs/pages/{page-name}.html`, comparing against `.stitch/DESIGN.md` Token Reference. Non-blocking: present drift warnings to user. User decides whether to fix via `edit_screens` or accept as-is
7. Present screenshot to user via `Read` on the downloaded PNG
8. **Iteration loop**: Ask user for feedback:
   - "How does this page look?"
   - Options: "Approve" / "Request changes" / "Regenerate from scratch"
   - **Request changes**: Gather feedback → `edit_screens` with the page's screenId and change prompt (GEMINI_3_FLASH) → re-run **Asset Download Procedure** → re-run **Drift Detection** (Per-Page procedure) → re-present screenshot → loop
   - **Regenerate**: Return to step 2 with adjusted prompt
   - **Approve**: Continue to step 9
9. After approval, update `metadata.json` screens map with the page entry:
   - Screen ID from Stitch
   - `type: "page"`
   - `name`: page name slug
   - `layout`: layout name reference (if layout-referenced strategy was used, omit for full generation)
   - `files`: paths to HTML and PNG
   - `generationStrategy`: "full" | "layout-referenced" | "in-place-edit"
10. Update `.stitch/SITE.md` sitemap — mark page as done: `- [x] /{page-name}`

---

## Phase 4: Verification

**Goal**: Confirm page outputs are complete

**Actions**:

1. Verify files exist:
   - `.stitch/designs/pages/{page-name}.html` — the page HTML source
   - `.stitch/designs/pages/{page-name}.png` — the page screenshot
   - Use `Bash(ls -la .stitch/designs/pages/{page-name}.{html,png})` to confirm
2. Verify `metadata.json` has the page entry with `type: "page"` and correct screen ID
3. Present summary to user:
   ```
   Page generated:
   - Name: {page-name}
   - Strategy: {Full generation / Layout-referenced / In-place edit}
   - Model: {GEMINI_3_PRO / GEMINI_3_FLASH}
   - Layout reference: {layout-name or 'none'}
   - Screenshot: .stitch/designs/pages/{page-name}.png
   - Consistency check: {passed / N warnings / skipped (greenfield)}
   - Drift detection: {clean / N tokens drifting / skipped}
   ```
4. Suggest next step:
   - If SITE.md has more pending pages: "Run `/ac-designer:page` for the next page ({next-page-name})"
   - If all pages complete: "All pages done. Run `/ac-designer:designer` for full orchestration or revisit any page with `/ac-designer:page {page-name}`"

---

## Agent Routing

Compatible agents (soft dependency — graceful fallback when absent):

| Agent | `subagent_type` | Used In | Purpose |
|-------|-----------------|---------|---------|
| explore | `ac:explore` | Phase 3, Step 2b | Codebase context for routes, models, components — feeds CODEBASE CONTEXT injection |
| gemini-vision | `ac:gemini-vision` | Phase 3, Step 1 | File-based visual analysis (video, multi-image). For pasted images: parent analyzes inline or calls gemini-cli MCP directly |

If ac:explore is unavailable, skip codebase context injection — CODEBASE CONTEXT block is omitted from the prompt, and **Consistency Check** is skipped.
If ac:gemini-vision is unavailable, skip subagent spawn — analyze pasted images inline with Claude, or call `mcp__gemini-cli__ask-gemini` directly if gemini-cli MCP is available. The **Stitch Web Bridge** manual path still supports image upload directly in the Stitch web UI.

---

## Error Recovery

- **Stitch API timeout on `generate_screen_from_text`**: Wait up to 10 minutes (Stitch generation is slow). If still no result, retry once. If second attempt fails, save the enhanced prompt to `/tmp/stitch-prompt-{page-name}.md` and instruct user to generate manually via **Stitch Web Bridge** Option A
- **`edit_screens` fails**: Verify the screenId exists via `list_screens`. If the screen was deleted externally, fall back to full generation
- **Layout HTML missing**: If strategy is "layout-referenced" but `.stitch/designs/layouts/{layout-name}.html` does not exist, fall back to "full generation" strategy and warn: "Layout HTML not found locally. Falling back to full generation without layout reference. Run `/ac-designer:layout {layout-name}` to regenerate."
- **Consistency Check reports mismatches**: Present warnings but do NOT block — user decides whether to iterate with `edit_screens` or accept as-is
