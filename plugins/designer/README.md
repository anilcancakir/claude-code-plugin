# designer

**Stitch UI design orchestrator for Claude Code.**

Manages the full Stitch MCP project lifecycle — from project setup and design foundation extraction to multi-page iteration and variant polish. Transforms vague UI ideas into precise, Gemini-optimized prompts using Refactoring UI principles.

## Install

```bash
# Requires ac marketplace
/plugin install designer@ac
```

## Requirements

- **Google Stitch MCP** must be installed and configured. Follow the official setup guide:
  **https://stitch.withgoogle.com/docs/mcp/setup**

  The skill uses Stitch MCP tools (`create_project`, `generate_screen_from_text`, `edit_screens`, `generate_variants`, etc.) for all design generation. Without the Stitch MCP server, the skill cannot function.

## What It Provides

A single skill (`designer`) that orchestrates the Stitch design workflow. Six phases plus cross-cutting procedures:

- **Phase 0: Project Setup** — Initialize Stitch projects, persist metadata, create SITE.md vision documents
- **Phase 1: Design Foundation** — Analyze generated screens to synthesize semantic design systems (DESIGN.md)
- **Phase 2: Layout System** — Design shared layout shells (app-shell, auth, dashboard) for structural consistency
- **Phase 3: Page Design** — Generate individual pages with strategy selection (full generation, variant-from-layout, variant-from-page, in-place edit)
- **Phase 4: Multi-Page Iteration** — Track progress across pages using baton files and SITE.md roadmaps
- **Phase 5: Variant & Polish** — Explore alternatives with `generate_variants`, refine with `edit_screens`
- **Asset Download Procedure** — Mandatory post-generation HTML + screenshot download to `.stitch/designs/`
- **Consistency Check** — Post-generation codebase-vs-design validation (fields, navigation, states)

Every generation runs through a **Prompt Enhancement Pipeline** (Steps 1-7 + Step 2b) that applies codebase context injection, terminology refinement, Refactoring UI design principles, layout reference injection, and Gemini optimization rules before calling Stitch.

## Key Features

- **Codebase-aware design** — ac:explore scans routes, models, widgets, and theme before each page generation, injecting structured context into Stitch prompts
- **Layout-referenced generation** — uses `generate_variants` from approved layout screens instead of regenerating from scratch, keeping header/tab-bar/FAB pixel-identical
- Prompt enhancement pipeline with Refactoring UI design tokens (spacing, type, shadow, color scales)
- Gemini-targeted prompt formatting (MUST/MUST NOT imperatives, hex-precise colors, section ordering)
- Model routing: GEMINI_3_PRO for layouts and critical pages, GEMINI_3_FLASH for regular pages and variants
- Mandatory asset download — HTML + screenshots saved locally after every generation or edit
- Post-generation consistency check — verifies design matches codebase reality (model fields, navigation, states)
- State management via `.stitch/` directory (metadata.json, DESIGN.md, SITE.md, baton files)
- Interactive workflow — user approves each design step before proceeding

## Reference Files

| File | Topic |
|------|-------|
| `references/design-mappings.md` | UI/UX terminology refinement and descriptor mappings |
| `references/prompt-keywords.md` | Component keywords and adjective palettes |
| `references/refactoring-ui-injection.md` | Refactoring UI design tokens and principles |
| `references/gemini-prompt-rules.md` | Gemini-targeted prompt optimization rules |
| `references/baton-schema.md` | Multi-page iteration state tracking format |

## License

MIT
