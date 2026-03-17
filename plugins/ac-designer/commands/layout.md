---
description: Generate layout shells (app-shell, auth, dashboard) — determines needed layouts from codebase or interview, generates via Stitch with DESIGN.md injection. Run after /ac-designer:init.
argument-hint: Layout name or type (optional, e.g., "app-shell", "auth", "dashboard")
model: opus
---

# Layout Generation

You are orchestrating layout shell generation for a Stitch design project. Layouts define the structural chrome — header, navigation, tab bar, sidebar, FAB — that all subsequent pages inherit. Every layout is generated via `generate_screen_from_text` with full DESIGN.md context injection for visual consistency.

Load `${CLAUDE_PLUGIN_ROOT}/skills/prompt-engine/SKILL.md` for all referenced procedures.

## Core Principles

- **DESIGN.md is the consistency contract**: Every layout prompt includes the DESIGN SYSTEM BLOCK section from `.stitch/DESIGN.md` copied verbatim — this ensures Gemini receives the exact same token constraints on every generation
- **Pro model for layouts**: Layouts always use GEMINI_3_PRO — structural decisions need deeper reasoning
- **Chrome first, content later**: Layout shells define navigation structure and chrome elements; content areas are placeholders
- **One layout at a time**: Generate, review, approve, then move to the next — never batch-generate without user checkpoint

---

## Phase 1: Preflight

**Goal**: Validate prerequisites and determine layout scope

**Actions**:

1. Check `.stitch/metadata.json` exists — if not, error: "Run `/ac-designer:init` first to create the Stitch project"
2. Check `.stitch/DESIGN.md` exists — if not, error: "Run `/ac-designer:init` first to establish design foundation"
3. Load `metadata.json` — extract `projectId`, `deviceType`, and existing screens map
4. Inventory existing layouts: filter screens where `type: "layout"` — note which layouts are already generated
5. Determine mode from `$ARGUMENTS`:
   - **Argument provided** (e.g., "app-shell", "auth"): Single layout mode — skip Phase 2, proceed directly to Phase 3 with the specified layout
   - **No argument**: Multi-layout mode — proceed to Phase 2 for layout determination

---

## Phase 2: Layout Determination

**Goal**: Decide which layouts to generate

**Actions**:

1. Detect project type:
   - **Existing codebase** (source files at project root): Spawn ac:explore agent to scan route structure, navigation patterns, and screen groupings:
     - `"CONTEXT: Determining layout shells for Stitch design project. GOAL: Identify distinct navigation contexts. DOWNSTREAM: Generate layout shells for each context. REQUEST: Scan route definitions, navigation widgets/components, screen groupings. Identify how many distinct chrome contexts exist (e.g., main app with bottom tabs, auth flow without tabs, admin dashboard with sidebar). Return: layout name suggestion, chrome elements (header, tab bar, sidebar, FAB, footer), and which routes belong to each. Max 30 lines."`
   - **Greenfield** (no source code): Interview the user about app structure via AskUserQuestion:
     - "How many distinct navigation contexts does your app have?"
     - Suggest default set: app-shell (main navigation), auth (login/register), dashboard (admin)
2. Compile layout plan — for each proposed layout, list:
   - Layout name (slugified, e.g., `app-shell`, `auth`, `dashboard`)
   - Chrome elements: which structural elements it includes (header, bottom tab bar, sidebar, FAB, footer)
   - Screen count estimate: how many pages will use this layout
3. Present layout plan to user for approval via AskUserQuestion:
   - Show the proposed layouts with their chrome elements
   - Options: "Approve" / "Add layout" / "Remove layout" / "Modify"
4. After approval, proceed to Phase 3 for each approved layout sequentially

## Agent Routing

Always use `ac:` prefixed `subagent_type` values. This command uses: `ac:explore` for codebase-based layout determination.

---

## Phase 3: Layout Generation

**Goal**: Generate layout shells with full prompt enhancement

For each layout in the approved plan, execute this sequence:

**Actions**:

1. Load `.stitch/DESIGN.md` for design system context
2. Run the **Prompt Enhancement Pipeline** (Steps 1-6 from prompt-engine SKILL.md) to build the generation prompt:
   - Layout-specific prompt emphasis: navigation structure, chrome elements (header, tab bar, sidebar, FAB), content area as placeholder region, responsive behavior
   - MUST include the DESIGN SYSTEM BLOCK section — copy it verbatim from `.stitch/DESIGN.md` between the vibe line and PAGE STRUCTURE
   - **STYLE ANCHOR**: If `.stitch/metadata.json` has a `foundationScreen` entry, append this text directive to the prompt: "STYLE ANCHOR — This layout MUST match the foundation screen's visual language exactly — same color palette, typography weights, border radii, and component shapes as defined in the DESIGN SYSTEM BLOCK above. Any deviation from these tokens is a bug."
   - PAGE STRUCTURE section should describe chrome elements with specific dimensions and positions, and a clearly marked content placeholder area
   - MUST NOT section should include: "Do not fill the content area with real content — use a single placeholder card or empty state"
3. **Quota check**: Load `proUsage` from `.stitch/metadata.json` before calling GEMINI_3_PRO:
   - If `proUsage.monthStart` doesn't match the current month (YYYY-MM format) → reset `proUsage.count` to 0, update `monthStart` to current month
   - If `proUsage.count >= 50`: switch `modelId` to **GEMINI_3_FLASH** and warn user: "GEMINI_3_PRO monthly limit reached. Switching to GEMINI_3_FLASH."
   - Else if `proUsage.count >= 45`: warn user: "Approaching GEMINI_3_PRO monthly limit (~50). Consider using GEMINI_3_FLASH for non-critical layouts."
4. Check if user has provided a visual reference (screenshot, sketch, mockup):
   - **Visual reference provided**: Invoke the **Stitch Web Bridge** procedure — user uploads reference + pastes enhanced prompt via Stitch web UI
   - **No visual reference**: Call `generate_screen_from_text` with:
     - `projectId`: from metadata.json
     - `prompt`: the enhanced prompt from step 2
     - `deviceType`: from metadata.json
     - `modelId`: **GEMINI_3_PRO** (or GEMINI_3_FLASH if quota fallback triggered in step 3)
5. **Quota increment**: If step 4 used GEMINI_3_PRO, increment `proUsage.count` by 1 and write back to `.stitch/metadata.json`
6. Run the **Asset Download Procedure** — saves HTML + PNG to `.stitch/designs/layouts/{layout-name}.html` and `.stitch/designs/layouts/{layout-name}.png`
7. Present the screenshot to user via `Read` on the downloaded PNG
8. **Iteration loop**: Ask user for feedback via AskUserQuestion:
   - "How does this layout look?"
   - Options: "Approve" / "Request changes" / "Regenerate from scratch"
   - **Request changes**: Gather feedback → `edit_screens` with the layout's screenId and change prompt → re-run **Asset Download Procedure** → re-present screenshot → loop
   - **Regenerate**: Return to step 2 with adjusted prompt
   - **Approve**: Continue to step 9
9. Update `metadata.json` screens map with the layout entry:
   - Screen ID from Stitch
   - `type: "layout"`
   - `name`: layout name
   - `files`: paths to HTML and PNG
10. Update `.stitch/SITE.md` sitemap with the layout entry

Repeat for each layout in the plan.

---

## Phase 4: Verification

**Goal**: Confirm all layouts are generated and saved

**Actions**:

1. For each layout in the plan, verify files exist:
   - `.stitch/designs/layouts/{name}.html` — the layout HTML source
   - `.stitch/designs/layouts/{name}.png` — the layout screenshot
   - Use `Bash(ls -la .stitch/designs/layouts/{name}.{html,png})` for each
2. Verify `metadata.json` has all layout entries with `type: "layout"` — count must match the approved plan
3. Present summary to user:
   - Layout name, device type, chrome elements
   - Screenshot thumbnail for each layout (via `Read` on PNG)
   - Total layouts generated vs planned
4. Suggest next step: "Layouts complete. Run `/ac-designer:page` to generate pages that reference these layouts."
