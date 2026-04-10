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
│   │   ├── .mcp.json             # MCP server configs (kodizm bundled)
│   │   ├── commands/             # 12 user-invocable /ac:* commands
│   │   ├── agents/               # 15 agent definitions (advisory: read-only, worker: write access)
│   │   ├── skills/
│   │   │   ├── prompt-writer/    # Shared CC prompt writing foundation + references/
│   │   │   ├── skill-creator/    # Skill creation + references/
│   │   │   ├── agent-creator/    # Agent creation + references/
│   │   │   ├── command-creator/  # Command creation + references/
│   │   │   ├── rule-creator/     # Rule creation (no references/)
│   │   │   ├── claude-md-writer/ # CLAUDE.md authoring + references/
│   │   │   ├── browser-qa/       # Skill + references/ for browser QA workflows
│   │   │   ├── maestro-qa/       # Skill + references/ for mobile QA workflows
│   │   │   └── flutter-qa/       # Skill + references/ for Flutter QA workflows
│   │   ├── references/          # Templates + shared QA patterns
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
│   ├── github-actions/           # GitHub Actions workflow generator plugin
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json
│   │   ├── skills/
│   │   │   └── github-actions/
│   │   │       └── SKILL.md      # CI/CD, releases, Docker, security hardening
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

| Command | Description |
|---------|-------------|
| `/ac:plan` | Lead Developer — 7-phase planning: classify (intent + complexity) → research (dynamic agent count) → pre-plan analysis (plan-analysis for Standard, plan-deep-analysis for Complex, skip-if-confident) → interview (clearance check, max 3 rounds) → generate plan (tier assignment, wave rules, QA scenarios) → review (plan-review for Standard skip-if-confident, plan-deep-review for Complex mandatory) → deliver |
| `/ac:execute` | Developer — execute approved plan with wave-by-wave parallel plan-worker agents (tier→model routing), wisdom accumulation across waves, per-step done-when verification with tier escalation retry, consolidated verification (Simple: build+test+lint, Standard: plan-code-review, Complex: plan-deep-code-review), 3-strike rule, workflow memory save |
| `/ac:init-claude-md` | Generate or enhance project CLAUDE.md — auto-discovers codebase, interviews developer, preserves custom sections |
| `/ac:init-rules` | Auto-generate `.claude/rules/` from project analysis |
| `/ac:setup-coding` | Analyze projects → interview → generate `my-coding` skill |
| `/ac:setup-language` | Interactive writing style analyzer — scans existing content, interviews developer, generates my-language skill |
| `/ac:setup-global-claude-md` | Generate global CLAUDE.md — interviews developer, detects skills, produces orchestration config |
| `/ac:commit` | Smart commit — preflight checks, convention detection, atomic commits, workflow memory save for significant changes. Delegates to git-master when available |
| `/ac:ideate` | Idea refinement — Socratic interview, ambiguity scoring, adversarial challenge, task generation, workflow memory save. Supports `--bulk` and `--loop` |
| `/ac:browser-qa` | Browser QA testing — 4 modes (ad-hoc, bug-repro, plan-verify, recheck), parallel execution across up to 4 agents, knowledge sharing across waves. Auto-detects Playwright CLI. Flags: `--headed`, `--no-parallel`, `--no-evidence` |
| `/ac:maestro-qa` | Mobile QA testing — 5 modes (ad-hoc, bug-repro, plan-verify, recheck, flow-run), MCP-driven via Maestro CLI, parallel execution across devices, knowledge sharing. Auto-detects Maestro MCP. Flags: `--no-parallel`, `--no-evidence`, `--platform` |
| `/ac:flutter-qa` | Flutter QA testing — 6 modes (ad-hoc, bug-repro, plan-verify, recheck, test-run, visual-regression), MCP-driven via flutter-skill, parallel execution across sessions, knowledge sharing. Auto-detects flutter-skill MCP. Flags: `--no-parallel`, `--no-evidence`, `--platform`, `--uri` |

## Agents (ac plugin)

| Agent | `subagent_type` | Role |
|-------|-----------------|------|
| `explore` | `"ac:explore"` | Codebase search specialist — files, patterns, relationships. Returns file:line references |
| `librarian` | `"ac:librarian"` | External docs specialist — docs, web search, code search via kodizm MCP (bundled) |
| `linter` | `"ac:linter"` | LSP code intelligence verifier — diagnostics and symbol structure checks |
| `plan-analysis` | `"ac:plan-analysis"` | Plan quality auditor — pre-gen directives (hidden intentions, AI-slop risks, unstated requirements). Standard plans |
| `plan-deep-analysis` | `"ac:plan-deep-analysis"` | Consolidated Opus pre-plan agent for Complex plans — merges plan-analysis + challenger + feasibility into 3-pass analysis (analysis, challenge, feasibility) |
| `plan-review` | `"ac:plan-review"` | Plan reviewer — blockers-only, approval bias, OKAY/REJECT verdict. Standard plans |
| `plan-deep-review` | `"ac:plan-deep-review"` | Merged plan reviewer for Complex plans — combines blocker checks with adversarial deep review (2-pass: blockers then adversarial). Replaces separate plan-review + plan-deep-review |
| `plan-worker` | `"ac:plan-worker"` | Plan step executor — executes single plan steps (code, server, infrastructure) with wisdom injection and structured verification output |
| `plan-code-review` | `"ac:plan-code-review"` | 3-stage reviewer for Standard plans — compliance verification (L1/L2/L3), spec compliance, code quality. Replaces separate plan-verifier + plan-code-review |
| `plan-deep-code-review` | `"ac:plan-deep-code-review"` | 4-stage deep reviewer for Complex plans — compliance, spec, quality, cross-layer integration. Replaces separate plan-verifier + plan-code-review + plan-deep-code-review |
| `challenger` | `"ac:challenger"` | Devil's advocate — stress-tests ideas and proposals, finds gaps, steelmans alternatives. Used in ideation (Phase 4) and pre-plan analysis (Complex) |
| `feasibility` | `"ac:feasibility"` | Feasibility evaluator — codebase fit, effort, dependencies. Used in ideation (Phase 4) and pre-plan analysis (Complex) |
| `browser-qa` | `"ac:browser-qa"` | Browser test executor — Playwright CLI, captures evidence. Spawned by /ac:browser-qa |
| `maestro-qa` | `"ac:maestro-qa"` | Mobile test executor — Maestro MCP on iOS/Android. Spawned by /ac:maestro-qa |
| `flutter-qa` | `"ac:flutter-qa"` | Flutter test executor — flutter-skill MCP. Spawned by /ac:flutter-qa |

Model, effort, color, maxTurns, and tools are defined in each agent's frontmatter file.

15 agents total. Search agents have `maxTurns` to prevent runaway loops (explore: 20, librarian: 30, linter: 10). Execution/verification/review agents have no maxTurns — they must complete all work. Advisory agents use denylist `disallowedTools: Write, Edit, NotebookEdit`. Execution agent (`plan-worker`) denies only `NotebookEdit`. Denylist auto-includes MCP tools without explicit allowlisting. Exception: `linter` uses allowlist (`tools: LSP, Glob, Read`) for intentional LSP access. `Agent` is NOT denied — CC already prevents subagents from spawning subagents, making it redundant. Plan review: `plan-review` (Sonnet, blockers-only) for Standard, `plan-deep-review` (Opus, merged blocker + adversarial) for Complex. Verification is consolidated: single agent per complexity level with multi-stage internal structure. `plan-code-review` (Sonnet, 3-stage) for Standard, `plan-deep-code-review` (Opus, 4-stage) for Complex. Always use the `ac:` prefixed `subagent_type` — builtin `Explore` and `explore` route to different agents.

## Skills & MCP

### ac plugin
- `prompt-writer` (Opus) — CC-optimal prompt writing foundation for all component creators. Has `references/` with dedup guide, frontmatter schemas, and writing patterns
- `skill-creator` (Opus) — Create Claude Code skills with progressive disclosure architecture. Has `references/` with skill-specific patterns. Uses `prompt-writer` as shared foundation
- `agent-creator` (Opus) — Create Claude Code agents following kodizm 5-section format. Has `references/` with agent templates. Uses `prompt-writer` as shared foundation
- `command-creator` (Opus) — Create Claude Code commands with phase-based structure and agent delegation. Has `references/` with command templates. Uses `prompt-writer` as shared foundation
- `rule-creator` (Sonnet) — Create path-scoped .claude/rules/ for coding conventions. Uses `prompt-writer` as shared foundation
- `claude-md-writer` (Sonnet) — Write CC-optimal CLAUDE.md and CLAUDE.local.md files. Has `references/` with section patterns and dedup guide. Uses `prompt-writer` as shared foundation
- `ac:browser-qa` skill (Sonnet, not user-invocable) — Browser QA workflow patterns and `playwright-cli` command routing. Has references/ for report format and evidence schema. Requires [Playwright CLI](https://github.com/microsoft/playwright-cli) (`npm install -g @playwright/cli@latest`)
- `ac:maestro-qa` skill (Sonnet, not user-invocable) — Mobile QA workflow patterns and Maestro MCP tool routing. Has references/ for report format and evidence schema. Requires [Maestro CLI](https://maestro.mobile.dev/) (`brew install maestro`) + user-installed MCP server
- `ac:flutter-qa` skill (Sonnet, not user-invocable) — Flutter QA workflow patterns and flutter-skill MCP tool routing. Has references/ for report format and evidence schema. Requires [flutter-skill](https://github.com/flutter-skill/flutter-skill) (`npm install -g flutter-skill`) + user-installed MCP server + `FlutterSkillBinding` in app
- `qa-patterns` reference (`plugins/ac/references/qa-patterns.md`) — Shared QA patterns across browser-qa, maestro-qa, flutter-qa (knowledge system, report format, parallel execution, evidence persistence)
- `memory-save` reference (`plugins/ac/references/memory-save.md`) — Workflow memory save directives for execute, commit, ideate, and investigation workflows
- MCP: `kodizm` (bundled) — Docs, web search, web fetch, code search via remote MCP

### github-cli plugin
- `github-cli` (Sonnet) — gh patterns for issues, PRs, releases, actions, gh api (REST + GraphQL), scripting

### github-actions plugin
- `github-actions` (Sonnet) — GitHub Actions workflow generator — CI/CD pipelines, releases, Docker builds, reusable workflows, security hardening

### git-master plugin
- `git-master` (Sonnet) — Atomic commits with style detection, rebase/squash, history archaeology

### frontend-design plugin
- `frontend-design` (Sonnet) — Production-grade UI for web and mobile with design systems and visual hierarchy. Has `references/`

### dart-lsp plugin
- LSP plugin — Dart/Flutter language server via `dart language-server`. Configured via `lspServers` inline in `marketplace.json` (no skills, no commands). Activates go-to-definition, find references, hover, and `<new-diagnostics>` for `.dart` files.

### json-lsp plugin
- LSP plugin — JSON language server via `vscode-json-languageserver`. Schema validation, hover, and diagnostics for `.json` and `.jsonc` files. Binary: `npm install -g vscode-langservers-extracted`.

### yaml-lsp plugin
- LSP plugin — YAML language server via `yaml-language-server`. Schema validation, hover, and diagnostics for `.yaml` and `.yml` files. Binary: `npm install -g yaml-language-server`.

### markdown-lsp plugin
- LSP plugin — Markdown language server via `marksman`. Link navigation, find references, and document symbols for `.md` and `.mdx` files. Binary: `brew install marksman`.

### Browser Testing ([Playwright CLI](https://github.com/microsoft/playwright-cli))

Playwright CLI is required for browser QA testing. Token-efficient CLI alternative to Playwright MCP — no large tool schemas or accessibility trees in context.

```bash
npm install -g @playwright/cli@latest
```

The `/ac:browser-qa` command auto-detects the CLI at runtime. No MCP server needed — all browser interactions use shell commands via `playwright-cli`.

- **Parallel execution**: When >3 test cases, automatically splits across up to 4 parallel agents with isolated Playwright CLI sessions. Disable with `--no-parallel`.
- **Knowledge sharing**: Agent-native knowledge system — agents read/write `.ac/qa/knowledge/project.jsonl` directly. Learned facts (selectors, flows, timing, gotchas) persist across all test runs project-wide. Parallel agents write to isolated temp files; parent merges after execution.
- **Headed mode**: `--headed` flag runs Playwright in a visible browser window for debugging.

### Mobile Testing ([Maestro CLI](https://maestro.mobile.dev/))

Maestro CLI is required for mobile QA testing. MCP-driven alternative — agent uses Maestro's built-in MCP server tools directly for step-by-step device interaction.

```bash
brew install maestro
```

Users must add Maestro MCP to their `.mcp.json`:
```json
{"maestro": {"command": "maestro", "args": ["mcp"]}}
```

The `/ac:maestro-qa` command auto-detects MCP tools at runtime. No additional setup needed beyond the MCP config.

- **Parallel execution**: When >3 test cases, automatically splits across up to 4 parallel agents with isolated device targeting. Disable with `--no-parallel`. Device-constrained: agents ≤ available devices.
- **Knowledge sharing**: Same agent-native knowledge system as browser-qa — shared `.ac/qa/knowledge/project.jsonl`. Parallel agents write to isolated `.mqa-*` temp files; parent merges after execution.

### Flutter Testing ([flutter-skill](https://github.com/flutter-skill/flutter-skill))

flutter-skill is required for Flutter QA testing. MCP-driven — agent uses flutter-skill's MCP server tools directly for step-by-step app interaction across iOS, Android, Web, and Desktop targets.

```bash
npm install -g flutter-skill
```

Users must add flutter-skill MCP to their `.mcp.json`:
```json
{"flutter-skill": {"command": "flutter-skill", "args": ["server"]}}
```

Apps must initialize `FlutterSkillBinding` in test mode to expose the interaction surface to the MCP tools.

The `/ac:flutter-qa` command auto-detects MCP tools at runtime. No additional setup needed beyond the MCP config and app integration.

- **Parallel execution**: When >3 test cases, automatically splits across up to 4 parallel agents with isolated session targeting. Disable with `--no-parallel`. Platform-constrained: agents target specific platforms via `--platform`.
- **Knowledge sharing**: Same agent-native knowledge system as browser-qa and maestro-qa — shared `.ac/qa/knowledge/project.jsonl`. Parallel agents write to isolated `.fqa-*` temp files; parent merges after execution.
- **Visual regression**: `visual-regression` mode captures baseline screenshots to `.ac/qa/baselines/` and diffs against them on subsequent runs.

## Design Principles

- **Anti-builtin**: ac replaces CC's native planning, web tools, and search agents — `EnterPlanMode`, `WebSearch`, `WebFetch`, `Agent(Explore)`, `Agent(Plan)` blocked via `permissions.deny` + `PreToolUse` hooks. Auto-configured by `/ac:setup-global-claude-md`. Commands include CRITICAL directives as defense-in-depth.
- **Multi-plugin marketplace**: Root is the catalog, each plugin is self-contained under `plugins/<name>/`
- **Model routing**: Haiku (search/fast), Sonnet (execution/analysis), Opus (planning/architecture/creation). Workers get per-step model based on tier (quick→Haiku, mid→Sonnet, senior→Opus) with auto-escalation on failure
- **Consistent briefing format**: Single template for all tiers. Task (goal + assignment + criteria) + Context (conventions + wisdom + commands) + Constraints (scope + must-not). Model capability handles complexity difference, not prompt verbosity. Step type (`code`/`infra`) routes to appropriate briefing format.
- **Agent model customization**: Explore (default Haiku) and Librarian (default Sonnet) — override via Claude Code's native `ANTHROPIC_DEFAULT_HAIKU_MODEL` / `ANTHROPIC_DEFAULT_SONNET_MODEL` env vars. Model profiles: `quality` (all Opus) / `balanced` (default — Haiku/Sonnet/Opus per frontmatter) / `budget` (Sonnet+Haiku only) — configure via env vars
- **Progressive disclosure**: Metadata always loaded → SKILL.md body on trigger → references/ on demand
- **Read-only advisory**: Agents that advise never have write tools
- **Plan-first**: All commands follow classify → research → interview → generate → review → install
- **reliability-first**: Right model for right task — default Sonnet execution, Opus for planning/investigation/architecture
- **Foreground-first agent synchronization**: Parallel agents that must all complete before proceeding use foreground (default) — CC waits for all automatically. Background (`run_in_background: true`) only for genuinely independent work; when all agents have reported, proceed. Verification agents are always foreground. All parallel Agent calls must be in a single message block.
- **Consolidated verification**: Single verification agent per complexity level with multi-stage internal structure. Simple: build+test+lint only (no verification agent). Standard: `plan-code-review` (3-stage: compliance, spec, quality). Complex: `plan-deep-code-review` (4-stage: compliance, spec, quality, cross-layer). Commit preflight skipped via `--skip-preflight` when invoked by execute post-verification. 3-strike rule: 3 failures → halt pipeline.
- **Pre-generation analysis**: Metis-inspired gap detection. Standard: plan-analysis (Sonnet, skip-if-confident). Complex: plan-deep-analysis (Opus, merged analysis+challenge+feasibility, skip-if-confident). Review pipeline: Standard → plan-review (skip-if-confident). Complex → plan-deep-review (merged blocker+adversarial, mandatory).
- **Token-efficient pipeline**: Skip-if-confident gates on advisory agents (plan-analysis, plan-review) using concrete criteria (single module, no external deps, no architectural impact, research found all patterns). Consolidated agents reduce subagent spawn overhead. Simple plans bypass planning pipeline entirely.
- **Subagent-only architecture**: All agents use subagent model (fresh context, custom model/tools). Fork model (inherits parent context + prompt cache) is cheaper but requires `model: inherit` (breaks model routing) and `tools: ['*']` (breaks read-only advisory). Use fork only when child needs full parent context AND same model AND no tool restriction
- **Conditional MCP routing**: Agents detect MCP tool availability at runtime — graceful fallback when tools not installed. kodizm MCP is bundled with ac plugin. Other MCP servers (maestro, flutter-skill) remain user-installed.
- **Tiered code search**: Grep (text) → LSP (semantic). Agents use LSP via code intelligence for structural queries when available.
- **Project-local storage**: Plans saved to `.ac/plans/`, tasks to `.ac/tasks/`, QA evidence to `.ac/qa/`, browser-qa state to `.ac/browser-qa/`, maestro-qa state to `.ac/maestro-qa/`, flutter-qa state to `.ac/flutter-qa/`, visual regression baselines to `.ac/qa/baselines/` in the working directory. Not gitignored by default — each project decides
- **Auto commit+push**: Orchestrators (execute, ideate) invoke `/ac:commit` after task completion to commit and push changes
- **Workflow memory save**: Execute, commit, ideate, and investigation workflows save up to 2 relevant memories (architecture decisions, root causes, codebase evolution) via CC's native memory system — no custom storage, no re-teaching CC memory mechanics. Directives in `references/memory-save.md`
- **Global CLAUDE.md dedup boundary**: Command prompts must not duplicate directives already in the global CLAUDE.md template (Intent Gate, Delegation Check, Research delegation, Verification, AskUserQuestion enforcement, barrier semantics). These load every message. Commands specify WHAT to do (which agents, which prompts), not HOW CC should behave.
- **Project context propagation**: Plugin subagents receive CLAUDE.md automatically (only CC's built-in Explore/Plan agents omit it via `omitClaudeMd: true`). ac's extraction pipeline adds plan-specific conventions beyond CLAUDE.md:
  - **Plan-time** (`plan.md`): Reads CLAUDE.md + CLAUDE.local.md + `.claude/rules/` + `my-coding` skill → extracts into `PROJECT_CONTEXT` → merges into plan's `### Conventions` section. This is a plan document section, not context injection — workers use it alongside their auto-loaded CLAUDE.md
  - **Execute-time** (`execute.md`): Extracts build/test/lint commands from CLAUDE.md as `RUNTIME_CONTEXT` for quick reference in worker briefings. Workers already receive full CLAUDE.md — RUNTIME_CONTEXT adds explicit test commands for verification steps
  - **Verification-time** (`execute.md` Phase 3): `PLAN_CONVENTIONS` passed to verification agents. Agents already receive CLAUDE.md — plan conventions add plan-specific rules
  - **Codebase State**: Plan classifies target area (Disciplined/Transitional/Legacy/Chaotic) → execute uses for tier escalation (Chaotic/Legacy auto-escalates quick→mid)

## Key Files

- `plugins/ac/skills/prompt-writer/SKILL.md` — Shared foundation for all creator skills — CC prompt writing principles
- `plugins/ac/skills/prompt-writer/references/` — Frontmatter schemas, dedup guide, writing patterns (shared by all creators)
- `plugins/ac/skills/claude-md-writer/SKILL.md` — CLAUDE.md authoring patterns, quality scoring, compression tactics
- `plugins/ac/skills/claude-md-writer/references/` — Section patterns (global + project), CLAUDE.md-specific dedup guide
- `plugins/ac/skills/skill-creator/references/skill-patterns.md` — Pattern library for writing Claude Code skills
- `plugins/ac/agents/plan-worker.md` — Plan step executor (kodizm 5-section format)
- `plugins/ac/agents/plan-deep-code-review.md` — 4-stage deep code review agent for complex plans
- `plugins/ac/agents/plan-deep-analysis.md` — Consolidated Opus pre-plan agent for complex plans (analysis + challenge + feasibility)
- `plugins/ac/references/coding-style-template.md` — Template for `my-coding` skill generation
- `plugins/ac/references/language-style-template.md` — Template for `my-language` skill generation
- `plugins/ac/references/global-claude-md-template.md` — Template for global CLAUDE.md generation
- `plugins/ac/references/project-claude-md-template.md` — Template for project CLAUDE.md generation
- `plugins/ac/references/prd-template.md` — Template for ideation document generation used by `/ac:ideate` (overview + task format reference)
- `plugins/ac/references/pm-base.md` — Shared ideation reference used by `/ac:ideate` — task file format, INVEST validation, interview dimensions, triage format
- `.ac/plans/` — Generated execution plans (project-local, created by /ac:plan)
- `.ac/tasks/` — Generated task documents (project-local, created by /ac:ideate)
- `.ac/qa/` — QA evidence archive (project-local, created by /ac:browser-qa) — screenshots, HTML snapshots, error logs per test run

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
- Commands delegate to creator skills for file generation — they don't write files directly. CLAUDE.md commands (`init-claude-md`, `setup-global-claude-md`) reference `claude-md-writer` for authoring knowledge. `init-rules` references `rule-creator`. Component creators (`skill-creator`, `agent-creator`, `command-creator`) reference `prompt-writer` as shared foundation
- Plugin-level `plugin.json` is minimal (3 fields) — version, category, tags live only in root `marketplace.json`
- Plugin subagents receive CLAUDE.md automatically (via `userContext.claudeMd`). Only CC's built-in Explore/Plan agents have `omitClaudeMd: true` for token savings. ac's context pipeline adds plan-specific conventions (PLAN_CONVENTIONS) beyond what CLAUDE.md provides.
- Global CLAUDE.md template directives (Intent Gate, Delegation Check, barriers, AskUserQuestion enforcement) load every message — don't repeat them in command prompts. Since subagents also receive CLAUDE.md, avoid re-injecting its content into agent prompts.
