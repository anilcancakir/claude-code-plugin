# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Mission

This is a **multi-plugin marketplace** for Claude Code. The main plugin `ac` ships a main-agent planning trio (`/ac:plan`, `/ac:execute`, `/ac:wisdom`) plus setup, init, and commit commands and creator skills for building Claude Code extensions (skills, agents, commands, rules, CLAUDE.md files). The planning trio runs entirely in the main agent (no subagent swarms, no tier routing); `/ac:setup-global-claude-md` blocks `EnterPlanMode`, `ExitPlanMode`, and `Agent(Plan)` in `~/.claude/settings.json` so the ac trio owns planning end-to-end. A `SessionStart` hook reminds Claude to invoke the user's personal `my-coding` and `my-language` twin skills before code or prose output. The marketplace structure allows additional plugins to be added independently.

## Architecture

```
├── .claude-plugin/
│   └── marketplace.json          # Plugin catalog — all plugins registered here
├── plugins/
│   ├── ac/                       # Main plugin: planning trio + creator skills + setup/init commands + SessionStart hook
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json       # Minimal: name, description, author
│   │   ├── .mcp.json             # MCP server configs (kodizm bundled)
│   │   ├── commands/             # 9 user-invocable /ac:* commands (plan, execute, wisdom, commit, init-*, setup-*)
│   │   ├── hooks/                # SessionStart twin-skill reminder (session-start.mjs + hooks.json)
│   │   ├── skills/
│   │   │   ├── prompt-writer/    # Shared CC prompt writing foundation + references/
│   │   │   ├── skill-creator/    # Skill creation + references/
│   │   │   ├── agent-creator/    # Agent creation + references/
│   │   │   ├── command-creator/  # Command creation + references/
│   │   │   ├── rule-creator/     # Rule creation
│   │   │   └── claude-md-writer/ # CLAUDE.md authoring + references/
│   │   ├── references/           # Templates for setup/init commands and CLAUDE.md generation
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
| `/ac:plan` | Interview-driven planning into `.ac/plans/<slug>.md`. Opus judges complexity; offers Mode A (plan all, execute continuously) / Mode B (plan-execute phase-by-phase) / single-file override. Nyquist rule: every Task needs automated Verify |
| `/ac:execute` | Run an approved plan end-to-end in the main agent. Auto-fix bugs / missing validation / blocking issues silently; ask only on architectural deviations (Rule 4). Per-task atomic commits, max-2 Verify attempts per Task |
| `/ac:wisdom` | Generate `SUMMARY.md` + `open-questions.md` for an executed plan. Auto-invoked by `/ac:execute` completion, callable standalone |
| `/ac:commit` | Smart commit — preflight checks, convention detection, atomic commits, push. Delegates to git-master when available |
| `/ac:init-claude-md` | Generate or enhance project CLAUDE.md — auto-discovers codebase via Read/Glob/Grep, interviews developer, preserves custom sections |
| `/ac:init-rules` | Auto-generate `.claude/rules/` — path-scoped conventions from project analysis |
| `/ac:setup-coding` | Scan projects, interview developer, generate `my-coding` skill |
| `/ac:setup-language` | Scan writing samples, interview developer, generate `my-language` skill |
| `/ac:setup-global-claude-md` | Generate global CLAUDE.md — interview, detect skills/MCP, produce lightweight orchestration config |

Commands run in the main context. None of them spawn subagents; the old `ac:explore`, `ac:librarian`, `plan-*`, and QA agents are gone for good. The new planning trio (`plan` / `execute` / `wisdom`) is main-agent-only by design. `/ac:execute` invokes `/ac:commit` after every successful Task so each atomic change lands on the remote with its own conventional commit. CC's native `Task` tool stays available if a future command needs it.

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

- **Multi-plugin marketplace**: Root is the catalog, each plugin is self-contained under `plugins/<name>/`.
- **Main-agent only planning**: `/ac:plan`, `/ac:execute`, `/ac:wisdom` run entirely in the main agent. No subagent swarms, no tier routing (haiku/sonnet/opus), no wave-based parallelism, no `Task` tool delegation. Opus 4.7 handles planning and execution.
- **Ac owns planning**: `/ac:setup-global-claude-md` denies `EnterPlanMode`, `ExitPlanMode`, `Agent(Plan)` in `~/.claude/settings.json` so CC's native plan mode cannot hijack the ac interview flow. `Agent(Explore)` stays allowed for manual user invocation. `WebSearch` / `WebFetch` denied only when kodizm MCP is operational as a replacement.
- **Progressive disclosure**: Metadata always loaded → SKILL.md body on trigger → `references/` on demand.
- **Creator skills stay generic**: `skill-creator`, `agent-creator`, `command-creator`, `rule-creator`, `claude-md-writer` produce components for any plugin. Examples use placeholder `<your-*>` subagent names rather than ac-internal agents.
- **Direct tool access in commands**: Init, setup, and planning commands discover the codebase with Read / Glob / Grep / Bash directly. No research subagents are spawned.
- **Per-task atomic commits**: `/ac:execute` invokes `/ac:commit` after every Task whose Verify passed. Conventional Commits format with scope (via `my-language`), auto-push by default, `--no-push` opt-out for offline or protected branches.
- **Nyquist rule**: Every Task in a plan file must declare an automated `Verify` command. If missing, `/ac:plan` adds a Wave 0 scaffold Task before it.
- **Twin skill enforcement**: `SessionStart` hook at `plugins/ac/hooks/session-start.mjs` injects an `additionalContext` reminder so Claude invokes `Skill("my-coding")` and `Skill("my-language")` before any code or prose output. Fires on startup, resume, clear, and compact triggers. Silent no-op if the user has not installed the twin skills.
- **Project override**: Always obey the active project's `CLAUDE.md`, `CLAUDE.local.md`, and `.claude/rules/`. When switching workdir, re-read and follow that directory's project rules.
- **Conditional MCP**: kodizm MCP is bundled. If `KODIZM_MCP_TOKEN` is not set, kodizm tools are unavailable but commands still function.
- **Plugin-level `plugin.json` is minimal** (name, description, author). Version, category, homepage, tags live only in `marketplace.json`.

## Key Files

- `plugins/ac/commands/plan.md`, `execute.md`, `wisdom.md`: Main-agent planning trio. Phase-based, AskUserQuestion-driven, per-task atomic commits via `/ac:commit`.
- `plugins/ac/commands/setup-global-claude-md.md`: Generates `~/.claude/CLAUDE.md` and configures `~/.claude/settings.json` deny list for native plan mode tools.
- `plugins/ac/hooks/hooks.json`, `plugins/ac/hooks/session-start.mjs`: SessionStart hook that injects Twin Mode reminder on startup, resume, clear, and compact triggers.
- `plugins/ac/skills/prompt-writer/SKILL.md`: Shared foundation for all creator skills, CC prompt writing principles.
- `plugins/ac/skills/prompt-writer/references/`: Frontmatter schemas, dedup guide, writing patterns (shared by all creators).
- `plugins/ac/skills/claude-md-writer/SKILL.md`: CLAUDE.md authoring patterns, quality scoring, compression tactics.
- `plugins/ac/skills/claude-md-writer/references/`: Section patterns (global + project), CLAUDE.md-specific dedup guide.
- `plugins/ac/skills/skill-creator/references/skill-patterns.md`: Pattern library for writing Claude Code skills.
- `plugins/ac/skills/command-creator/references/command-patterns.md`: Phase templates, AskUserQuestion patterns, generic agent delegation examples.
- `plugins/ac/references/coding-style-template.md`: Template for `my-coding` skill generation.
- `plugins/ac/references/language-style-template.md`: Template for `my-language` skill generation.
- `plugins/ac/references/global-claude-md-template.md`: Template for global CLAUDE.md generation.
- `plugins/ac/references/project-claude-md-template.md`: Template for project CLAUDE.md generation.

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
