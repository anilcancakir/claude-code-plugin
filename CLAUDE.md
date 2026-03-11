# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Mission

This is a **multi-plugin marketplace** for Claude Code. The main plugin `ac` turns Claude Code into a structured development partner with plan-first workflows, specialized agents with model routing, and a skill creator. The marketplace structure allows additional plugins to be added independently.

## Architecture

```
├── .claude-plugin/
│   └── marketplace.json          # Plugin catalog — all plugins registered here
├── plugins/
│   ├── ac/                       # Main plugin
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json       # Minimal: name, description, author
│   │   ├── .mcp.json             # MCP server configs (context7)
│   │   ├── commands/             # 10 user-invocable /ac:* commands
│   │   ├── agents/               # 5 read-only agent definitions
│   │   ├── skills/
│   │   │   └── ac-skill-creator/ # Skill + references/ for component creation
│   │   ├── README.md
│   │   └── LICENSE
│   ├── github-cli/               # GitHub CLI skill plugin
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── skills/
│   │   │   └── github-cli/
│   │   │       └── SKILL.md      # Comprehensive gh reference (338 lines)
│   │   ├── README.md
│   │   └── LICENSE
│   ├── git-master/               # Git expert skill plugin
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── skills/
│   │   │   └── git-master/
│   │   │       └── SKILL.md      # Atomic commits, rebase, history archaeology
│   │   ├── README.md
│   │   └── LICENSE
│   ├── frontend-design/          # Frontend design skill plugin
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── skills/
│   │   │   └── frontend-design/
│   │   │       ├── SKILL.md      # Design systems, hierarchy, aesthetics (429 lines)
│   │   │       └── references/   # Deep-dive: hierarchy, color, mobile
│   │   ├── README.md
│   │   └── LICENSE
│   ├── dart-lsp/                 # Dart/Flutter language server plugin
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── README.md
│   │   └── LICENSE
│   ├── json-lsp/                 # JSON language server plugin
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── README.md
│   │   └── LICENSE
│   ├── yaml-lsp/                 # YAML language server plugin
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── README.md
│   │   └── LICENSE
│   └── markdown-lsp/             # Markdown language server plugin
│       ├── .claude-plugin/
│       │   └── plugin.json
│       ├── README.md
│       └── LICENSE
├── CLAUDE.md                     # This file
├── README.md                     # Marketplace README
├── package.json
└── LICENSE
```

All components are pure markdown with YAML frontmatter. No compiled code.

**Marketplace vs Plugin boundary**: Root `.claude-plugin/marketplace.json` is the catalog — it lists all plugins with `"source": "./plugins/<name>"`. Each plugin has its own `.claude-plugin/plugin.json` (minimal: name, description, author). Heavy metadata (version, category, homepage, tags) lives only in marketplace.json.

## Commands (ac plugin)

| Command | Description | Model |
|---------|-------------|-------|
| `/ac:plan` | Classify → research → interview → plan | Opus |
| `/ac:deep` | Opus-powered root cause analysis for complex bugs and debugging | Opus |
| `/ac:execute` | Execute approved plan (parallel background agents or sequential) | Sonnet |
| `/ac:ultra` | End-to-end disciplined execution — certainty → plan → execute → verify | Opus |
| `/ac:init-claude-md` | Generate/enhance project CLAUDE.md | Opus |
| `/ac:init-rules` | Auto-generate `.claude/rules/` from project analysis | Opus |
| `/ac:setup-coding` | Analyze projects → interview → generate `my-coding` skill | Opus |
| `/ac:setup-language` | Analyze writing → interview → generate `my-language` skill | Opus |
| `/ac:setup-global-claude-md` | Detect plugin skills + global MCP → interview → generate `~/.claude/CLAUDE.md` | Opus |
| `/ac:commit` | Smart commit — preflight checks, convention detection, atomic commits | Sonnet |

## Agents (ac plugin)

| Agent | `subagent_type` | Model | Role | Tools |
|-------|-----------------|-------|------|-------|
| `explore` | `"ac:explore"` | Haiku | Codebase search — files, patterns, relationships | Glob, Grep, Read, LS |
| `librarian` | `"ac:librarian"` | Haiku | External docs — context7 MCP → WebSearch fallback | context7, WebSearch, WebFetch |
| `linter` | `"ac:linter"` | Haiku | LSP code intelligence verifier — `<new-diagnostics>` + navigation checks, VERDICT output | LSP, Glob, Read |
| `plan-analysis` | `"ac:plan-analysis"` | Sonnet | Plan gap/slop detection, acceptance criteria audit | Read, Grep, Glob |
| `plan-review` | `"ac:plan-review"` | Opus | Plan executability verification (OKAY/REJECT) | Read, Grep, Glob |

All agents are read-only. No write tools on advisory roles. Always use the `ac:` prefixed `subagent_type` — builtin `Explore` and `explore` route to different agents.

## Skills & MCP

### ac plugin
- `ac-skill-creator` (Opus) — Create skills, agents, commands, rules for Claude Code. Has `references/` with templates
- MCP: `context7` — Live documentation API via `@upstash/context7-mcp`

### github-cli plugin
- `github-cli` (Sonnet) — Comprehensive gh CLI reference: issues, PRs, releases, actions, secrets, labels, search, gh api (REST + GraphQL), jq patterns, scripting

### git-master plugin
- `git-master` (Sonnet) — Git expert: atomic commits with style detection, interactive rebase/squash, history archaeology (blame, bisect, pickaxe)

### frontend-design plugin
- `frontend-design` (Sonnet) — Production-grade UI for web and mobile: design systems (spacing/type/shadow/color), visual hierarchy, distinctive aesthetics, mobile patterns. Has `references/` for hierarchy, color system, and mobile components

### dart-lsp plugin
- LSP plugin — Dart/Flutter language server via `dart language-server`. Configured via `lspServers` inline in `marketplace.json` (no skills, no commands). Activates go-to-definition, find references, hover, and `<new-diagnostics>` for `.dart` files.

### json-lsp plugin
- LSP plugin — JSON language server via `vscode-json-languageserver`. Schema validation, hover, and diagnostics for `.json` and `.jsonc` files. Binary: `npm install -g vscode-langservers-extracted`.

### yaml-lsp plugin
- LSP plugin — YAML language server via `yaml-language-server`. Schema validation, hover, and diagnostics for `.yaml` and `.yml` files. Binary: `npm install -g yaml-language-server`.

### markdown-lsp plugin
- LSP plugin — Markdown language server via `marksman`. Link navigation, find references, and document symbols for `.md` and `.mdx` files. Binary: `brew install marksman`.

## Design Principles

- **Multi-plugin marketplace**: Root is the catalog, each plugin is self-contained under `plugins/<name>/`
- **Model routing**: Haiku (search/fast), Sonnet (execution/analysis), Opus (planning/architecture/creation)
- **Progressive disclosure**: Metadata always loaded → SKILL.md body on trigger → references/ on demand
- **Read-only advisory**: Agents that advise never have write tools
- **Plan-first**: All commands follow classify → research → interview → generate → review → install
- **Certainty-first** (ultra): End-to-end discipline — no implementation without certainty, no completion without evidence

## Key Files

- `plugins/ac/skills/ac-skill-creator/references/prompt-patterns.md` — Pattern library for writing Claude Code components
- `plugins/ac/skills/ac-skill-creator/references/coding-style-template.md` — Template for `my-coding` skill generation
- `plugins/ac/skills/ac-skill-creator/references/language-style-template.md` — Template for `my-language` skill generation
- `plugins/ac/skills/ac-skill-creator/references/global-claude-md-template.md` — Template for global CLAUDE.md generation
- `plugins/ac/skills/ac-skill-creator/references/project-claude-md-template.md` — Template for project CLAUDE.md generation

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
- Commands delegate to `ac-skill-creator` for file generation — they don't write files directly
- Plugin-level `plugin.json` is minimal (3 fields) — version, category, tags live only in root `marketplace.json`
