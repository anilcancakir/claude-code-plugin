# ac-designer

**Stitch UI design orchestrator with command-based architecture for Claude Code.**

Manages the full Stitch MCP project lifecycle — from project initialization and layout generation to page design and full orchestration. Transforms vague UI ideas into precise, Gemini-optimized prompts using Refactoring UI principles and codebase-aware context injection.

## Install

```bash
claude plugin add ./plugins/ac-designer
```

## Requirements

- **Google Stitch MCP** (required) — must be installed and configured. Follow the official setup guide:
  **https://stitch.withgoogle.com/docs/mcp/setup**

  Authentication via `STITCH_API_KEY` environment variable or `gcloud` CLI. Without the Stitch MCP server, the plugin cannot function.

- **ac plugin** (soft dependency) — provides `ac:explore` for codebase scanning (routes, models, widgets, theme) and `ac:gemini-vision` for screenshot analysis. The plugin works without it but loses codebase-aware design capabilities.

- **gemini-cli** (optional, npm: gemini-mcp-tool) — enables Gemini vision for design import from screenshots. Useful for recreating existing designs in Stitch.

## Commands

| Command | Description | Status |
|---------|-------------|--------|
| `/ac-designer:init` | Initialize Stitch project — create or connect project, generate design foundation, build DESIGN.md | Active |
| `/ac-designer:layout` | Generate layout shells — determines needed layouts from codebase or interview, generates with DESIGN.md injection | Active |
| `/ac-designer:page` | Generate a single page — strategy selection (full or layout-referenced), prompt enhancement, consistency check, iteration | Active |
| `/ac-designer:designer` | Full orchestrator — auto-detects state, directs missing phases, generates all pages with baton-driven iteration | Active |

## Shared Skill

- **prompt-engine** — Internal prompt enhancement pipeline. Not user-invocable. Applies Refactoring UI design tokens, Gemini optimization rules, terminology refinement, and layout reference injection before calling Stitch MCP tools.

## Reference Files

| File | Topic |
|------|-------|
| `references/design-mappings.md` | UI/UX terminology refinement and descriptor mappings |
| `references/prompt-keywords.md` | Component keywords and adjective palettes |
| `references/gemini-prompt-rules.md` | Gemini-targeted prompt optimization rules |
| `references/refactoring-ui-injection.md` | Refactoring UI design tokens and principles |
| `references/baton-schema.md` | Multi-page iteration state tracking format |

## Key Features

- **Codebase-aware design** — ac:explore scans routes, models, widgets, and theme before each page generation, injecting structured context into Stitch prompts
- **Layout-referenced generation** — injects layout shell constraints (header, tab bar, FAB) into every page prompt via DESIGN.md, keeping chrome elements pixel-identical across pages
- Prompt enhancement pipeline with Refactoring UI design tokens (spacing, type, shadow, color scales)
- Gemini-targeted prompt formatting (MUST/MUST NOT imperatives, hex-precise colors, section ordering)
- Model routing: GEMINI_3_PRO for layouts and critical pages, GEMINI_3_FLASH for regular pages and variants
- Mandatory asset download — HTML + screenshots saved locally after every generation or edit
- Post-generation consistency check — verifies design matches codebase reality (model fields, navigation, states)
- State management via `.stitch/` directory (metadata.json, DESIGN.md, SITE.md, baton files)

## Note on Stitch Web Bridge

The Stitch API is text-only and does not support image upload. When visual references are needed (e.g., recreating an existing design or matching a mockup), the plugin includes a "Stitch Web Bridge" procedure that guides users through the Stitch web interface for image-based operations, then syncs results back to the MCP workflow.

## License

MIT
