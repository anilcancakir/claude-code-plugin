# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Mission

This is a **multi-plugin marketplace** for Claude Code. The main plugin `ac` ships a small set of setup, init, and commit commands plus creator skills for building Claude Code extensions (skills, agents, commands, rules, CLAUDE.md files). Planning, execution, ideation, and QA pipelines have been removed: CC's native plan mode, default agents, and `Task` tool stay in charge. The marketplace structure allows additional plugins to be added independently.

## Architecture

```
├── .claude-plugin/
│   └── marketplace.json          # Plugin catalog — all plugins registered here
├── plugins/
│   ├── ac/                       # Main plugin — creator skills + setup/init commands
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json       # Minimal: name, description, author
│   │   ├── .mcp.json             # MCP server configs (kodizm bundled)
│   │   ├── commands/             # 6 user-invocable /ac:* commands
│   │   ├── skills/
│   │   │   ├── prompt-writer/    # Shared CC prompt writing foundation + references/
│   │   │   ├── skill-creator/    # Skill creation + references/
│   │   │   ├── agent-creator/    # Agent creation + references/
│   │   │   ├── command-creator/  # Command creation + references/
│   │   │   ├── rule-creator/     # Rule creation
│   │   │   └── claude-md-writer/ # CLAUDE.md authoring + references/
│   │   ├── references/           # Templates for setup/init commands
│   │   ├── README.md
│   │   └── LICENSE
│   ├── github-cli/               # GitHub CLI skill plugin
│   ├── github-actions/           # GitHub Actions workflow generator plugin
│   ├── git-master/               # Git expert skill plugin
│   ├── frontend-design/          # Frontend design skill plugin
│   ├── dart-lsp/                 # Dart/Flutter language server plugin
│   ├── json-lsp/                 # JSON language server plugin
│   ├── yaml-lsp/                 # YAML language server plugin
│   ├── markdown-lsp/             # Markdown language server plugin
│   └── ac-new/                   # Liquid template renderer (experimental)
├── CLAUDE.md                     # This file
├── README.md                     # Marketplace README
├── package.json
└── LICENSE
```

All components are pure markdown with YAML frontmatter. No compiled code (except `ac-new`).

**Marketplace vs Plugin boundary**: Root `.claude-plugin/marketplace.json` is the catalog. It lists all plugins with `"source": "./plugins/<name>"`. Each plugin has its own `.claude-plugin/plugin.json` (minimal: name, description, author). Heavy metadata (version, category, homepage, tags) lives only in marketplace.json.

## Commands (ac plugin)

| Command | Description |
|---------|-------------|
| `/ac:commit` | Smart commit — preflight checks, convention detection, atomic commits, push. Delegates to git-master when available |
| `/ac:init-claude-md` | Generate or enhance project CLAUDE.md — auto-discovers codebase via Read/Glob/Grep, interviews developer, preserves custom sections |
| `/ac:init-rules` | Auto-generate `.claude/rules/` — path-scoped conventions from project analysis |
| `/ac:setup-coding` | Scan projects, interview developer, generate `my-coding` skill |
| `/ac:setup-language` | Scan writing samples, interview developer, generate `my-language` skill |
| `/ac:setup-global-claude-md` | Generate global CLAUDE.md — interview, detect skills/MCP, produce lightweight orchestration config |

Commands run in the main context. None of them spawn subagents — the old `ac:explore`, `ac:librarian`, `plan-*`, and QA agents have been removed. CC's native `Task` tool is available if a command or user ever needs it.

## Skills & MCP

### ac plugin — creator skills

- `prompt-writer` (Opus) — CC-optimal prompt writing foundation for all component creators. Has `references/` with dedup guide, frontmatter schemas, and writing patterns
- `skill-creator` (Opus) — Create Claude Code skills with progressive disclosure architecture. Uses `prompt-writer` as shared foundation
- `agent-creator` (Opus) — Create Claude Code agents following the kodizm 5-section format. Uses `prompt-writer` as shared foundation
- `command-creator` (Opus) — Create Claude Code commands with phase-based structure. Uses `prompt-writer` as shared foundation
- `rule-creator` (Sonnet) — Create path-scoped `.claude/rules/` for coding conventions. Uses `prompt-writer` as shared foundation
- `claude-md-writer` (Sonnet) — Write CC-optimal CLAUDE.md and CLAUDE.local.md files. Has `references/` with section patterns and dedup guide. Uses `prompt-writer` as shared foundation
- MCP: `kodizm` (bundled) — Docs, web search, web fetch, code search via remote MCP. Used by creator skills for external documentation lookups.

### Companion plugins

- `github-cli` (Sonnet) — gh patterns for issues, PRs, releases, actions, gh api
- `github-actions` (Sonnet) — GitHub Actions workflow generator — CI/CD, releases, Docker builds, security hardening
- `git-master` (Sonnet) — Atomic commits with style detection, rebase/squash, history archaeology
- `frontend-design` (Sonnet) — Production-grade UI for web and mobile with design systems and visual hierarchy
- `dart-lsp` / `json-lsp` / `yaml-lsp` / `markdown-lsp` — Language servers (go-to-definition, hover, diagnostics) configured via `lspServers` inline in `marketplace.json`

## Design Principles

- **Multi-plugin marketplace**: Root is the catalog, each plugin is self-contained under `plugins/<name>/`
- **Lightweight orchestration**: The ac plugin does not override CC's native planning, agent dispatch, or web tools beyond optionally blocking `WebSearch` / `WebFetch` when kodizm MCP is configured. No Intent Gate, no Delegation Check, no tier routing, no parallel subagent mandates are injected into user sessions.
- **Progressive disclosure**: Metadata always loaded → SKILL.md body on trigger → `references/` on demand
- **Creator skills stay generic**: `skill-creator`, `agent-creator`, `command-creator`, `rule-creator`, `claude-md-writer` produce components for any plugin. Examples use placeholder `<your-*>` subagent names rather than ac-internal agents.
- **Direct tool access in commands**: init and setup commands discover the codebase with Read / Glob / Grep / Bash directly. No research subagents are spawned.
- **Project override**: Always obey the active project's `CLAUDE.md`, `CLAUDE.local.md`, and `.claude/rules/`. When switching workdir, re-read and follow that directory's project rules.
- **Conditional MCP**: kodizm MCP is bundled. If `KODIZM_MCP_TOKEN` is not set, kodizm tools are unavailable but commands still function.
- **Plugin-level `plugin.json` is minimal** (name, description, author). Version, category, homepage, tags live only in `marketplace.json`.

## Key Files

- `plugins/ac/skills/prompt-writer/SKILL.md` — Shared foundation for all creator skills — CC prompt writing principles
- `plugins/ac/skills/prompt-writer/references/` — Frontmatter schemas, dedup guide, writing patterns (shared by all creators)
- `plugins/ac/skills/claude-md-writer/SKILL.md` — CLAUDE.md authoring patterns, quality scoring, compression tactics
- `plugins/ac/skills/claude-md-writer/references/` — Section patterns (global + project), CLAUDE.md-specific dedup guide
- `plugins/ac/skills/skill-creator/references/skill-patterns.md` — Pattern library for writing Claude Code skills
- `plugins/ac/skills/command-creator/references/command-patterns.md` — Phase templates, AskUserQuestion patterns, generic agent delegation examples
- `plugins/ac/references/coding-style-template.md` — Template for `my-coding` skill generation
- `plugins/ac/references/language-style-template.md` — Template for `my-language` skill generation
- `plugins/ac/references/global-claude-md-template.md` — Template for global CLAUDE.md generation
- `plugins/ac/references/project-claude-md-template.md` — Template for project CLAUDE.md generation

## Adding a New Plugin

**Skill/command plugin** (github-cli, git-master, frontend-design pattern):
1. Create `plugins/<name>/` with `.claude-plugin/plugin.json` (name, description, author)
2. Add commands/, agents/, skills/ as needed
3. Add entry in `.claude-plugin/marketplace.json` with `"source": "./plugins/<name>"`
4. Add README.md and LICENSE

**LSP plugin** (dart-lsp pattern):
1. Create `plugins/<name>/` with `.claude-plugin/plugin.json`, README.md, LICENSE
2. Add entry in `.claude-plugin/marketplace.json` with `"strict": false` and `"lspServers"` inline — no `.lsp.json` file

## Gotchas

- No test infrastructure — pure markdown plugin, verify manually via `claude plugin add ./`
- Commands use `${CLAUDE_PLUGIN_ROOT}` for template paths — set by Claude Code at runtime to the plugin's actual directory
- Commands delegate to creator skills for file generation; they don't write files directly. CLAUDE.md commands (`init-claude-md`, `setup-global-claude-md`) reference `claude-md-writer`. `init-rules` references `rule-creator`. Component creators (`skill-creator`, `agent-creator`, `command-creator`) reference `prompt-writer`.
- Plugin-level `plugin.json` is minimal (3 fields) — version, category, tags live only in root `marketplace.json`
