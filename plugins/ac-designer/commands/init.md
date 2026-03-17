---
description: Initialize Stitch project — create or connect project, generate design foundation, build DESIGN.md from first screen. Use when starting a new design project or connecting to an existing Stitch project.
argument-hint: Project name or Stitch project ID (optional)
model: opus
---

# Initialize Stitch Design Project

You are orchestrating the setup and design foundation for a Stitch-powered design project. Determine the correct path (new project, existing project, or re-init), create the project scaffold, generate a representative first screen, and extract design tokens into DESIGN.md.

## Core Principles

- **Never overwrite**: Existing `.stitch/metadata.json` requires explicit user confirmation before overwriting
- **Screenshot-first when available**: Visual references produce dramatically better results than text-only prompts
- **Tokens from real output**: DESIGN.md is extracted from actual generated HTML, not invented from thin air
- **Reference, don't duplicate**: Procedures from prompt-engine are invoked by name, not re-implemented here

Load the prompt-engine skill for all procedures referenced in this command:
`${CLAUDE_PLUGIN_ROOT}/skills/prompt-engine/SKILL.md`

---

## Phase 1: Preflight

**Goal**: Validate state and determine path (new vs existing project)

**Actions**:

1. Check if `.stitch/metadata.json` exists:
   - If exists, read it and present to user: "Found existing Stitch project: {title} ({projectId}). Resume with existing project or reinitialize?"
   - If user wants to resume, skip to Phase 3 (Design Foundation)
   - If user wants to reinitialize, require explicit confirmation: "This will overwrite the current project metadata. Confirm?"
   - If does not exist, continue to Phase 2
2. Parse `$ARGUMENTS`:
   - If contains a Stitch project ID (e.g., `projects/abc123` or a bare ID): use `get_project` to retrieve metadata, then skip to saving in Phase 2 step 4
   - If contains a project name or description: use as title for new project creation
   - If empty: interview user — "What are you designing? Give a project name or describe the app."
3. Detect project context:
   - Check for source code indicators (`pubspec.yaml`, `package.json`, `composer.json`, `go.mod`) to determine if this is a greenfield project or has an existing codebase
   - Check if user provided a screenshot or visual reference in the conversation

---

## Phase 2: Project Setup

**Goal**: Create or connect to a Stitch project and establish the local scaffold

**Actions**:

1. `list_projects` with `filter: "view=owned"` — check for existing match by title
2. If match found, present to user: "Found existing Stitch project '{title}'. Connect to this one or create new?"
3. If no match or user wants new: `create_project` with descriptive title, then `get_project` for full metadata including designTheme
4. Save project data to `.stitch/metadata.json`:
   ```json
   {
     "name": "projects/{id}",
     "projectId": "{id}",
     "title": "Project Name",
     "designTheme": {
       "colorMode": "DARK",
       "font": "INTER",
       "roundness": "ROUND_EIGHT",
       "customColor": "#hex",
       "saturation": 3
     },
     "proUsage": { "count": 0, "monthStart": "YYYY-MM" },
     "screens": {}
   }
   ```
   Set `proUsage.monthStart` to the current month from conversation context (format `YYYY-MM`, e.g., `2026-03`). This tracks GEMINI_3_PRO usage for downstream quota enforcement.
5. Create `.stitch/SITE.md`:
   ```markdown
   # [Project Title]

   ## Vision
   [1-2 sentence project vision — derive from user's description or $ARGUMENTS]

   ## Sitemap
   - [ ] /home — Home page
   - [ ] /about — About page

   ## Roadmap
   1. Layout shells
   2. Core pages
   3. Secondary pages
   4. Polish & variants
   ```
   Interview the user to refine Vision and Sitemap sections if the description is vague.
6. Create directory structure:
   ```
   mkdir -p .stitch/designs/layouts .stitch/designs/pages
   ```

---

## Phase 3: Design Foundation

**Goal**: Generate a representative first screen and extract design tokens into DESIGN.md

Skip token extraction if `.stitch/DESIGN.md` already exists and user confirms keeping it.

### Import Strategy

Determine the generation path based on available inputs. Paths are additive — combine layers for richer prompts.

**Path A — Screenshot available** (user provides screenshot, mockup, or visual reference):

1. **Stitch Web Bridge** (best quality): Invoke the **Stitch Web Bridge** procedure from prompt-engine — save enhanced prompt to `/tmp/stitch-prompt-foundation.md`, present Manual (upload to stitch.withgoogle.com) / Auto (text-only) options
2. **+ Visual analysis routing** — analyze the visual reference and merge findings into the generation prompt:
   - **Pasted image (no file path)** — Claude already sees the image in this context:
     - For basic review: describe colors, layout, typography, component styles inline — merge into generation prompt
     - For detailed design token extraction (recommended for init foundation): `Write` image to `/tmp/stitch-vision-foundation.png` if needed, then call `mcp__gemini-cli__ask-gemini` with: `Analyze this UI screenshot for design tokens: list all colors with hex values, typography (family, sizes, weights), spacing scale, border radius values, shadows, and component styles. Be precise and exhaustive.` — merge Gemini's response into generation prompt
   - **File path provided** (user gives a path like `~/Downloads/screen.png`): Spawn ac:gemini-vision subagent with the file path for detailed analysis — merge result into generation prompt
   - **If gemini-cli MCP unavailable**: Analyze pasted images inline with Claude — describe visual design language from the visible image

**Path B — No screenshot** (greenfield or text-only):

1. **Codebase analysis** (if project root has source code): Spawn ac:explore agent with: `"CONTEXT: Initializing design foundation for {project-type}. GOAL: Extract theme tokens, routes, components. DOWNSTREAM: Design token injection into Stitch prompt. REQUEST: Find theme definitions, color constants, typography, route structure, reusable components. Max 30 lines."` — inject findings as CODEBASE CONTEXT
2. **User text description** (always available as baseline): Interview user about visual direction, app type, target platform, preferred style (dark/light, dense/spacious, playful/corporate)

### Generation

1. Run **Prompt Enhancement Pipeline** (Steps 1-6 from prompt-engine) for the foundation screen — use all available context from the import strategy above
2. **GEMINI_3_PRO Quota Check** — read `proUsage` from `.stitch/metadata.json` before generation:
   - If `proUsage.monthStart` does not match the current month (from conversation context, format `YYYY-MM`): reset `proUsage.count` to 0 and update `monthStart` to current month
   - If `proUsage.count >= 50`: switch `modelId` to GEMINI_3_FLASH and warn user: "GEMINI_3_PRO monthly limit reached. Switching to GEMINI_3_FLASH."
   - If `proUsage.count >= 45`: warn user: "Approaching GEMINI_3_PRO monthly limit (~50). Consider using GEMINI_3_FLASH for non-critical screens." — proceed with GEMINI_3_PRO
   - Otherwise: proceed with GEMINI_3_PRO silently
3. `generate_screen_from_text` with:
   - `projectId`: from metadata.json
   - `prompt`: the enhanced prompt from the pipeline
   - `modelId`: GEMINI_3_PRO (foundation screen is critical — use pro model) — or GEMINI_3_FLASH if quota exceeded per step 2
   - `deviceType`: from user preference or project context (MOBILE for Flutter/mobile apps, DESKTOP for web apps, AGNOSTIC if unclear)
4. **Update proUsage** — if step 3 used GEMINI_3_PRO: increment `proUsage.count` by 1 in `.stitch/metadata.json` and write immediately
5. Run **Asset Download Procedure** from prompt-engine — saves HTML + screenshot to `.stitch/designs/pages/foundation.*`
6. Run **Consistency Check** from prompt-engine — only if Step 2b (codebase analysis) produced a CODEBASE CONTEXT block. Skip for greenfield projects
7. Run **Design Token Extraction** from prompt-engine on the downloaded HTML — load `references/design-tokens-v2.md` for extraction rules and output format. Produces DESIGN.md with two sections: DESIGN SYSTEM BLOCK (verbatim-injectable prompt fragment) and Token Reference (structured token table).
8. Write `.stitch/DESIGN.md` with the extracted tokens in v2 format — two sections: `## DESIGN SYSTEM BLOCK` and `## Token Reference`.
9. **Store foundationScreen** in `.stitch/metadata.json` — used by downstream commands (layout.md, page.md, designer.md) as STYLE ANCHOR for text directives:
   ```json
   "foundationScreen": {
     "screenName": "projects/{id}/screens/{screenId}",
     "htmlPath": ".stitch/designs/pages/foundation.html",
     "pngPath": ".stitch/designs/pages/foundation.png"
   }
   ```
10. Update `.stitch/metadata.json` screens map with the foundation screen entry
11. Present screenshot to user via `Read` (after download is confirmed):
   - "Here is your design foundation. Review the visual direction and extracted design tokens."
   - If user wants changes: `edit_screens` with user feedback → re-run **Asset Download Procedure** → re-run **Design Token Extraction** → update DESIGN.md and foundationScreen entry
   - Iterate until user approves

---

## Phase 4: Verification

**Goal**: Confirm init outputs are complete and correct

**Actions**:

1. Verify all required files exist:
   - `.stitch/metadata.json` — has `projectId`, `name`, `proUsage`, and `foundationScreen` fields
   - `.stitch/DESIGN.md` — has `## DESIGN SYSTEM BLOCK` section and `## Token Reference` section
   - `.stitch/SITE.md` — has Vision, Sitemap, and Roadmap sections
   - `.stitch/designs/layouts/` — directory exists
   - `.stitch/designs/pages/` — directory exists
2. If any file is missing, report what failed and suggest remediation
3. Present summary to user:
   ```
   Project initialized:
   - Name: {title}
   - ID: {projectId}
   - Theme: {colorMode}, {font}, accent {customColor}
   - Design tokens: [highlight 2-3 key extracted values — e.g., "Deep Ocean Blue (#0F172A) backgrounds, Inter font family, 8px radius"]
   - Foundation screen: .stitch/designs/pages/foundation.png
   - Next step: Run /ac-designer:layout to create layout shells, or /ac-designer:page to generate pages directly
   ```

---

## Agent Routing

Compatible agents (soft dependency — graceful fallback when absent):

| Agent | `subagent_type` | Used In | Purpose |
|-------|-----------------|---------|---------|
| explore | `ac:explore` | Phase 3, Path B | Codebase theme tokens, routes, components for CODEBASE CONTEXT injection |
| gemini-vision | `ac:gemini-vision` | Phase 3, Path A | File-based visual analysis (video, multi-image). For pasted images: parent analyzes inline or calls gemini-cli MCP directly |

If ac:explore is unavailable, skip codebase analysis — fall back to user interview for design direction.
If ac:gemini-vision is unavailable, skip subagent spawn — analyze pasted images inline with Claude, or call `mcp__gemini-cli__ask-gemini` directly if gemini-cli MCP is available. The **Stitch Web Bridge** manual path still supports image upload directly in the Stitch web UI.

---

## Error Recovery

- **Stitch API timeout on `generate_screen_from_text`**: Wait up to 10 minutes (Stitch generation is slow). If still no result, retry once. If second attempt fails, save the enhanced prompt to `/tmp/stitch-prompt-foundation.md` and instruct user to generate manually via **Stitch Web Bridge** Option A
- **`create_project` fails**: Check `list_projects` for quota/limits. Present error to user
- **Design Token Extraction produces empty results**: The generated HTML may be minimal. Ask user to provide more specific design direction and regenerate
- **Re-init on existing project**: Never overwrite `.stitch/metadata.json` without explicit user confirmation. Present current state and ask
