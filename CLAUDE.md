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
│   │   ├── .mcp.json             # MCP server configs (empty — MCP servers are user-installed)
│   │   ├── commands/             # 10 user-invocable /ac:* commands
│   │   ├── agents/               # 14 read-only agent definitions
│   │   ├── skills/
│   │   │   ├── ac-skill-creator/ # Skill + references/ for component creation
│   │   │   └── browser-qa/       # Skill + references/ for browser QA workflows
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
│   ├── ac-designer/              # Stitch UI design orchestrator plugin (command-based)
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── commands/             # init, layout, page, designer, audit
│   │   ├── skills/
│   │   │   └── prompt-engine/    # Shared prompt enhancement (not user-invocable)
│   │   │       ├── SKILL.md      # 8-step pipeline, asset download, consistency check, drift detection, Web Bridge, stitch-skills reference
│   │   │       └── references/   # Design mappings, prompt rules, Refactoring UI, baton schema, DESIGN.md v2, drift detection, stitch-skills
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

| Command | Description |
|---------|-------------|
| `/ac:plan` | Classify → research (with CLAUDE.md + my-coding context extraction) → interview → pre-generation analysis → plan (with QA scenarios, required Conventions section) |
| `/ac:execute` | Execute approved plan with project context propagation (PLAN_CONVENTIONS + RUNTIME_CONTEXT → worker prompts, convention-aware verification) → Complexity-driven Verification Wave + Codebase State tier escalation |
| `/ac:init-claude-md` | Generate/enhance project CLAUDE.md |
| `/ac:init-rules` | Auto-generate `.claude/rules/` from project analysis |
| `/ac:setup-coding` | Analyze projects → interview → generate `my-coding` skill |
| `/ac:setup-language` | Analyze writing → interview → generate `my-language` skill |
| `/ac:setup-global-claude-md` | Detect plugin skills + global MCP → interview → generate `~/.claude/CLAUDE.md` |
| `/ac:commit` | Smart commit — preflight checks (skippable via `--skip-preflight`), convention detection, atomic commits |
| `/ac:ideate` | Unified idea refinement — Socratic interview with mathematical ambiguity scoring, adversarial challenge, and Jira-ready task generation. Supports `--bulk` for meeting notes triage and `--loop` for autonomous plan→execute |
| `/ac:browser-qa` | Browser QA testing — 4 modes (ad-hoc, bug-repro, plan-verify, recheck). Detects MCP browser backends, delegates execution to browser-qa agent, produces structured PASS/FAIL/BLOCKED reports |

## Agents (ac plugin)

| Agent | `subagent_type` | NOT | Model | Effort | Color | Role | Tools |
|-------|-----------------|-----|-------|--------|-------|------|-------|
| `explore` | `"ac:explore"` | `"Explore"`, `"explore"` | Haiku | low | green | Codebase search — files, patterns, relationships | Glob, Grep, Read, LS, BashOutput |
| `librarian` | `"ac:librarian"` | `"librarian"` | Sonnet | medium | blue | External docs — context7 MCP → WebSearch fallback | Glob, Grep, LS, Read, BashOutput, WebSearch, WebFetch, context7, gemini-cli |
| `linter` | `"ac:linter"` | `"linter"` | Haiku | low | yellow | LSP code intelligence verifier — `<new-diagnostics>` + navigation checks, VERDICT output | LSP, Glob, Read |
| `plan-analysis` | `"ac:plan-analysis"` | `"plan-analysis"` | Sonnet | medium | yellow | Plan quality auditor with dual-mode: pre-generation (Metis — hidden intentions, AI-slop risks before plan writing) and post-generation (gaps, tier sanity after plan writing) | Read, Grep, Glob, LS |
| `plan-review` | `"ac:plan-review"` | `"plan-review"` | Opus | high | green | Adversarial plan reviewer — Momus-class, bias toward REJECT (OKAY/REJECT) | Read, Grep, Glob, gemini-cli |
| `verifier` | `"ac:verifier"` | `"verifier"` | Sonnet | medium | green | Post-execution plan compliance audit (APPROVE/REJECT) | Read, Grep, Glob, LS |
| `challenger` | `"ac:challenger"` | `"challenger"` | Opus | high | red | Devil's advocate — gaps, risks, blind spots, alternative approaches | Glob, Grep, LS, Read |
| `feasibility` | `"ac:feasibility"` | `"feasibility"` | Sonnet | medium | cyan | Pragmatic evaluator — codebase fit, effort, prerequisites, dependencies | Glob, Grep, LS, Read, BashOutput |
| `code-reviewer` | `"ac:code-reviewer"` | `"code-reviewer"` | Sonnet | medium | yellow | 2-stage review — spec compliance against plan acceptance criteria, then code quality (CRITICAL/IMPORTANT/MINOR, APPROVED/BLOCKED verdict) | Glob, Grep, LS, Read |
| `gemini-vision` | `"ac:gemini-vision"` | `"gemini-vision"` | Sonnet | medium | cyan | File-based multimodal analysis — video, multi-image, large visual contexts via Gemini. Pasted images analyzed inline | Read, Glob, LS, gemini-cli |
| `investigate` | `"ac:investigate"` | `"investigate"` | Opus | high | red | Root cause investigator — hypothesis-driven debugging with structured evidence. Use proactively for hairy bugs | Glob, Grep, Read, LS, BashOutput |
| `security-reviewer` | `"ac:security-reviewer"` | `"security-reviewer"` | Sonnet | medium | red | OWASP-aware security scanner — severity×exploitability scoring (SECURE/VULNERABLE verdict). Optional in Complex verification | Glob, Grep, LS, Read |
| `code-simplifier` | `"ac:code-simplifier"` | `"code-simplifier"` | Sonnet | medium | cyan | Post-implementation clarity pass — simplifications preserving behavior, CLAUDE.md-aware. Opt-in only, advisory | Glob, Grep, LS, Read |
| `browser-qa` | `"ac:browser-qa"` | `"browser-qa"` | Sonnet | medium | blue | Browser QA execution — navigates pages, interacts with elements, captures evidence, returns structured test results. Spawned by /ac:browser-qa command | Read, Glob, LS, BashOutput |

All agents are read-only. No write tools on advisory roles. All agents enforce `disallowedTools: Write, Edit` as defense-in-depth. Always use the `ac:` prefixed `subagent_type` — builtin `Explore` and `explore` route to different agents.

## Skills & MCP

### ac plugin
- `ac-skill-creator` (Opus) — Create skills, agents, commands, rules for Claude Code. Has `references/` with templates
- `ac:browser-qa` skill (Sonnet, not user-invocable) — Browser QA workflow patterns, MCP backend routing, token efficiency, self-healing. Has references/ for MCP backend tool schemas and report format
- MCP: `context7` (user-installed) — Live documentation API via `@upstash/context7-mcp`
- MCP: `gemini-cli` (optional, user-installed, npm: gemini-mcp-tool) — Gemini CLI bridge for multimodal, large context, brainstorm. **Usage rule**: Always pass content inline to `ask-gemini` — never use `@filepath` for files outside the project workspace (Gemini cannot read them). Gemini is a supplementary "second eye", not the primary analyzer — Opus agents do the main analysis

### github-cli plugin
- `github-cli` (Sonnet) — Comprehensive gh CLI reference: issues, PRs, releases, actions, secrets, labels, search, gh api (REST + GraphQL), jq patterns, scripting

### git-master plugin
- `git-master` (Sonnet) — Git expert: atomic commits with style detection, interactive rebase/squash, history archaeology (blame, bisect, pickaxe)

### frontend-design plugin
- `frontend-design` (Sonnet) — Production-grade UI for web and mobile: design systems (spacing/type/shadow/color), visual hierarchy, distinctive aesthetics, mobile patterns. Has `references/` for hierarchy, color system, and mobile components

### ac-designer plugin
- `prompt-engine` (Sonnet, not user-invocable) — Shared prompt enhancement pipeline for ac-designer commands. 8-step pipeline (DESIGN.md injection, Gemini optimization, codebase context, layout reference), asset download procedure, consistency check, drift detection, design token extraction, Stitch Web Bridge, stitch-skills reference. Has `references/` for design mappings, prompt keywords, Gemini rules, Refactoring UI tokens, baton schema, DESIGN.md v2 format, drift detection, and embedded Google stitch-skills
- Commands: `/ac-designer:init`, `/ac-designer:layout`, `/ac-designer:page`, `/ac-designer:designer`, `/ac-designer:audit`
- Requires [Google Stitch MCP](https://stitch.withgoogle.com/docs/mcp/setup) (official, 8 tools at `stitch.googleapis.com/mcp`)

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
- **Model routing**: Haiku (search/fast), Sonnet (execution/analysis), Opus (planning/architecture/creation). Workers get per-step model based on tier (quick→Haiku, mid→Sonnet, senior→Opus) with auto-escalation on failure
- **Agent model customization**: Explore (default Haiku) and Librarian (default Sonnet) — override via Claude Code's native `ANTHROPIC_DEFAULT_HAIKU_MODEL` / `ANTHROPIC_DEFAULT_SONNET_MODEL` env vars. Model profiles: `quality` (all Opus) / `balanced` (default — Haiku/Sonnet/Opus per frontmatter) / `budget` (Sonnet+Haiku only) — configure via env vars
- **Progressive disclosure**: Metadata always loaded → SKILL.md body on trigger → references/ on demand
- **Read-only advisory**: Agents that advise never have write tools
- **Plan-first**: All commands follow classify → research → interview → generate → review → install
- **reliability-first**: Right model for right task — default Sonnet execution, Opus for planning/investigation/architecture
- **Complexity-driven verification**: Verification depth scales with plan complexity — Simple (build+test only), Standard (code-reviewer + linter, skip Opus verifier), Complex (full 3-agent wave). Build+test and verification agents launch concurrently. Commit preflight skipped via `--skip-preflight` when invoked by execute post-verification.
- **Pre-generation analysis**: Metis-inspired gap detection — plan-analysis agent runs in pre-generation mode to catch hidden intentions and AI-slop risks before plan writing. Post-gen analysis runs in parallel with Deep Review (plan-review) when selected.
- **Subagent-only architecture**: All agents use subagent model (fresh context, custom model/tools). Fork model (inherits parent context + prompt cache) is cheaper but requires `model: inherit` (breaks model routing) and `tools: ['*']` (breaks read-only advisory). Use fork only when child needs full parent context AND same model AND no tool restriction
- **Conditional MCP routing**: Agents detect MCP tool availability at runtime — graceful fallback when tools not installed. All MCP servers are user-installed, not bundled
- **Project-local storage**: Plans saved to `.ac/plans/`, tasks to `.ac/tasks/` in the working directory. Not gitignored by default — each project decides
- **Auto commit+push**: Orchestrators (execute, ideate) invoke `/ac:commit` after task completion to commit and push changes
- **Project context propagation**: Subagents don't receive CLAUDE.md by design (CC's `userContext: {}` for subagents). ac compensates with a hybrid extraction pipeline:
  - **Plan-time** (`plan.md`): Reads CLAUDE.md + CLAUDE.local.md + `.claude/rules/` + `my-coding` skill → extracts into `PROJECT_CONTEXT` → merges into plan's `### Conventions` section (required)
  - **Execute-time** (`execute.md`): Reads CLAUDE.md fresh → extracts build/test/lint commands + gotchas as `RUNTIME_CONTEXT` (deduplicated against `PLAN_CONVENTIONS`) → injected into worker prompts (compact for quick tier, full for mid/senior)
  - **Verification-time** (`execute.md` Phase 5): `PLAN_CONVENTIONS` + `RUNTIME_CONTEXT` passed to code-reviewer and verifier agent prompts for convention compliance checking
  - **Ideation-time** (`ideate.md`): Reads CLAUDE.md → extracts as `PROJECT_CONVENTIONS` → injected into challenger and feasibility agent prompts
  - **Codebase State**: Plan classifies target area (Disciplined/Transitional/Legacy/Chaotic) → execute uses for tier escalation (Chaotic/Legacy auto-escalates quick→mid)

## Key Files

- `plugins/ac/skills/ac-skill-creator/references/prompt-patterns.md` — Pattern library for writing Claude Code components
- `plugins/ac/skills/ac-skill-creator/references/coding-style-template.md` — Template for `my-coding` skill generation
- `plugins/ac/skills/ac-skill-creator/references/language-style-template.md` — Template for `my-language` skill generation
- `plugins/ac/skills/ac-skill-creator/references/global-claude-md-template.md` — Template for global CLAUDE.md generation
- `plugins/ac/skills/ac-skill-creator/references/project-claude-md-template.md` — Template for project CLAUDE.md generation
- `plugins/ac/skills/ac-skill-creator/references/prd-template.md` — Template for ideation document generation used by `/ac:ideate` (overview + task format reference)
- `plugins/ac/skills/ac-skill-creator/references/pm-base.md` — Shared ideation reference used by `/ac:ideate` — task file format, INVEST validation, interview dimensions, triage format
- `.ac/plans/` — Generated execution plans (project-local, created by /ac:plan)
- `.ac/tasks/` — Generated task documents (project-local, created by /ac:ideate)

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
- ac-designer has a soft dependency on ac plugin for `ac:explore` (codebase scanning) and `ac:gemini-vision` (file-based visual analysis — video, multi-image). Pasted images are analyzed inline by Claude or via direct `mcp__gemini-cli__ask-gemini` call — graceful fallback when absent
- CC subagents receive `userContext: {}` (no CLAUDE.md) by design — ac's context propagation pipeline compensates by extracting and injecting project rules at plan/execute/verify time via prompt variables (PROJECT_CONTEXT, PLAN_CONVENTIONS, RUNTIME_CONTEXT)
