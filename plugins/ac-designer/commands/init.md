---
description: Initialize Stitch project — create or connect project, generate design foundation, build DESIGN.md from first screen. Use when starting a new design project or connecting to an existing Stitch project.
argument-hint: Project name or Stitch project ID (optional)
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

**Goal**: Validate state, determine path, and choose generation mode BEFORE creating any project

**Actions**:

1. Check if `.stitch/metadata.json` exists:
   - If exists, read it and present to user: "Found existing Stitch project: {title} ({projectId}). Resume with existing project or reinitialize?"
   - If user wants to resume, skip to Phase 3 (Design Foundation) — use **Auto** mode
   - If user wants to reinitialize, require explicit confirmation: "This will overwrite the current project metadata. Confirm?"
   - If does not exist, continue to step 2
2. Parse `$ARGUMENTS`:
   - If contains a Stitch project ID (e.g., `projects/abc123` or a bare ID): use `get_project` to retrieve metadata, then skip to saving in Phase 2 step 4 — use **Auto** mode
   - If contains a project name or description: use as title for new project creation
   - If empty: interview user — "What are you designing? Give a project name or describe the app."
3. Detect project context:
   - Check for source code indicators (`pubspec.yaml`, `package.json`, `composer.json`, `go.mod`) to determine if this is a greenfield project or has an existing codebase
   - Check if user provided a screenshot or visual reference in the conversation
4. **Choose generation mode** — ask the user via AskUserQuestion BEFORE creating any project:

   **CRITICAL**: Do NOT call `create_project` before this step. An empty Stitch project cannot accept prompts in the web UI — the user must create the project WITH the first screen in web UI if they choose Manual.

   - Question: "How do you want to generate the foundation screen?"
   - Options:
     - **Auto (MCP API)** — "Generate via Stitch MCP directly from Claude Code. Best for text descriptions and codebase-aware prompts."
     - **Manual (Stitch Web UI)** — "Create the project and first screen in stitch.withgoogle.com. Best when you have a screenshot/mockup to upload — Stitch web UI supports image upload, the API does not."
   - If user has pasted a screenshot: recommend Manual (mention image upload advantage)
   - Store the choice as `generationMode` for Phase 2 and Phase 3 branching

---

## Phase 2: Project Setup

**Goal**: Create or connect to a Stitch project and establish the local scaffold

Branch on `generationMode` from Phase 1 step 4:

### Auto Mode (MCP API)

1. `list_projects` with `filter: "view=owned"` — check for existing match by title
2. If match found, present to user: "Found existing Stitch project '{title}'. Connect to this one or create new?"
3. If no match or user wants new: `create_project` with descriptive title, then `get_project` for full metadata including designTheme
4. Save project data to `.stitch/metadata.json` (step 7 below)

### Manual Mode (Stitch Web UI)

1. Guide the user to create the project AND first screen in Stitch web UI:
   - "Go to **stitch.withgoogle.com** → Create new project → Enter your prompt (and upload your screenshot if you have one) → Generate the first screen"
   - Help build the prompt first: run **Prompt Enhancement Pipeline** (Steps 1-6 from prompt-engine) to build an enhanced prompt. Save to `/tmp/stitch-prompt-foundation.md` and present to user for copy-paste into Stitch web UI
   - If user has a pasted screenshot: analyze inline with Claude (extract colors, typography, layout, component styles) and merge into the enhanced prompt text
2. Wait for user to complete generation in web UI
3. Ask user for the project ID or URL — extract project ID from the Stitch URL or user input
4. `get_project` with the project ID to retrieve metadata (title, designTheme, screens)
5. Save project data to `.stitch/metadata.json` (step 7 below)

### Common (both modes)

7. Save project data to `.stitch/metadata.json`:
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
     "screens": {}
   }
   ```
8. Create `.stitch/SITE.md`:
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
9. Create directory structure:
   ```
   mkdir -p .stitch/designs/layouts .stitch/designs/pages
   ```

---

## Phase 3: Design Foundation

**Goal**: Generate (or retrieve) a representative first screen and extract design tokens into DESIGN.md

Skip token extraction if `.stitch/DESIGN.md` already exists and user confirms keeping it.

Branch on `generationMode` from Phase 1 step 4:

### Auto Mode — Generate via MCP

**Context gathering** — gather visual and codebase context before generation:

- **Pasted image available** — analyze inline with Claude only. Do NOT spawn ac:gemini-vision (loses image). Do NOT call mcp__gemini-cli__ask-gemini (cannot receive image). Claude describes: colors with hex values, layout structure, typography (family, sizes, weights), spacing patterns, border radius, shadows, component styles. Merge findings into the generation prompt
- **File path provided** (user gives a path like `~/Downloads/screen.png`): Spawn ac:gemini-vision subagent with the file path for detailed analysis — or call `mcp__gemini-cli__ask-gemini` with `@filepath` syntax. Merge result into generation prompt
- **Codebase exists** (source code at project root): Spawn ac:explore agent with: `"CONTEXT: Initializing design foundation for {project-type}. GOAL: Extract theme tokens, routes, components. DOWNSTREAM: Design token injection into Stitch prompt. REQUEST: Find theme definitions, color constants, typography, route structure, reusable components. Max 30 lines."` — inject findings as CODEBASE CONTEXT
- **No visual reference, no codebase** (greenfield text-only): Interview user about visual direction, app type, target platform, preferred style (dark/light, dense/spacious, playful/corporate)

**Generation**:

1. Run **Prompt Enhancement Pipeline** (Steps 1-6 from prompt-engine) — use all gathered context
2. `generate_screen_from_text` with:
   - `projectId`: from metadata.json
   - `prompt`: the enhanced prompt from the pipeline
   - `modelId`: GEMINI_3_PRO
   - `deviceType`: from user preference or project context (MOBILE for Flutter/mobile apps, DESKTOP for web apps, AGNOSTIC if unclear)
3. Run **Asset Download Procedure** from prompt-engine — saves HTML + screenshot to `.stitch/designs/pages/foundation.*`
4. Run **Consistency Check** from prompt-engine — only if codebase analysis produced a CODEBASE CONTEXT block. Skip for greenfield projects
5. Continue to **Token Extraction** (common steps below)

### Manual Mode — Retrieve from Web UI

The user already created the project and first screen in Stitch web UI during Phase 2. Now retrieve the generated screen:

1. `list_screens` with `projectId` from metadata.json — find the foundation screen (usually the first/only screen)
2. `get_screen` with the screen's resource name — retrieve HTML source and screenshot URLs
3. Run **Asset Download Procedure** from prompt-engine — download HTML + screenshot to `.stitch/designs/pages/foundation.*` using the URLs from `get_screen`
4. Continue to **Token Extraction** (common steps below)

### Token Extraction (both modes)

1. Run **Design Token Extraction** from prompt-engine on the downloaded HTML — load `references/design-tokens-v2.md` for extraction rules and output format. Produces DESIGN.md with two sections: DESIGN SYSTEM BLOCK (verbatim-injectable prompt fragment) and Token Reference (structured token table).
2. Write `.stitch/DESIGN.md` with the extracted tokens in v2 format — two sections: `## DESIGN SYSTEM BLOCK` and `## Token Reference`.
3. **Store foundationScreen** in `.stitch/metadata.json` — used by downstream commands (layout.md, page.md, designer.md) as STYLE ANCHOR for text directives:
   ```json
   "foundationScreen": {
     "screenName": "projects/{id}/screens/{screenId}",
     "htmlPath": ".stitch/designs/pages/foundation.html",
     "pngPath": ".stitch/designs/pages/foundation.png"
   }
   ```
4. Update `.stitch/metadata.json` screens map with the foundation screen entry
5. Present screenshot to user via `Read` (after download is confirmed):
   - "Here is your design foundation. Review the visual direction and extracted design tokens."
   - **Auto mode iteration**: If user wants changes → `edit_screens` with user feedback → re-run **Asset Download Procedure** → re-run **Design Token Extraction** → update DESIGN.md and foundationScreen entry → iterate until approved
   - **Manual mode iteration**: If user wants changes → guide user back to Stitch web UI to edit the screen → re-run `get_screen` + Asset Download + Token Extraction → iterate until approved

---

## Phase 4: Verification

**Goal**: Confirm init outputs are complete and correct

**Actions**:

1. Verify all required files exist:
   - `.stitch/metadata.json` — has `projectId`, `name`, and `foundationScreen` fields
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
If ac:gemini-vision is unavailable, skip subagent spawn — analyze file-path images via `mcp__gemini-cli__ask-gemini` with `@filepath` syntax if gemini-cli MCP is available. For pasted images: always analyze inline with Claude (subagents and MCP tools cannot see pasted images). The **Stitch Web Bridge** manual path still supports image upload directly in the Stitch web UI.

---

## Error Recovery

- **Stitch API timeout on `generate_screen_from_text`**: Wait up to 10 minutes (Stitch generation is slow). If still no result, retry once. If second attempt fails, save the enhanced prompt to `/tmp/stitch-prompt-foundation.md` and instruct user to generate manually via **Stitch Web Bridge** Option A
- **`create_project` fails**: Check `list_projects` for quota/limits. Present error to user
- **Design Token Extraction produces empty results**: The generated HTML may be minimal. Ask user to provide more specific design direction and regenerate
- **Re-init on existing project**: Never overwrite `.stitch/metadata.json` without explicit user confirmation. Present current state and ask
