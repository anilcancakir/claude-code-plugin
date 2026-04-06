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
│   │   ├── commands/             # 14 user-invocable /ac:* commands
│   │   ├── agents/               # 16 read-only agent definitions
│   │   ├── skills/
│   │   │   ├── skill-creator/    # Skill + references/ for component creation
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
| `/ac:plan` | Lead-developer pattern (Identity + Capabilities & Constraints) — classify → research (with CLAUDE.md + my-coding context extraction) → dynamic convergence interview (≤20% ambiguity) → pre-generation analysis → plan (with QA scenarios, required Conventions section, mandatory Deep Review for Complex) |
| `/ac:execute` | Developer pattern (Identity + Capabilities & Constraints) — execute approved plan with project context propagation (PLAN_CONVENTIONS + RUNTIME_CONTEXT → plan-worker agents, convention-aware layered verification: plan-verifier → plan-code-review → plan-deep-code-review) + Codebase State tier escalation |
| `/ac:init-claude-md` | Generate or enhance project CLAUDE.md — auto-discovers codebase, interviews developer, preserves custom sections |
| `/ac:init-rules` | Auto-generate `.claude/rules/` from project analysis |
| `/ac:setup-coding` | Analyze projects → interview → generate `my-coding` skill |
| `/ac:setup-language` | Interactive writing style analyzer — scans existing content, interviews developer, generates my-language skill |
| `/ac:setup-global-claude-md` | Generate global CLAUDE.md — interviews developer, detects skills, produces orchestration config |
| `/ac:commit` | Smart commit — preflight checks, convention detection, atomic commits. Delegates to git-master when available |
| `/ac:ideate` | Idea refinement — Socratic interview, ambiguity scoring, adversarial challenge, task generation. Supports `--bulk` and `--loop` |
| `/ac:work` | Ad-hoc parallel execution — decompose request into independent tasks, route to model tiers, fire simultaneously, complexity-driven verification |
| `/ac:browser-qa` | Browser QA testing — 4 modes (ad-hoc, bug-repro, plan-verify, recheck), parallel execution across up to 4 agents, knowledge sharing across waves. Auto-detects Playwright CLI. Flags: `--headed`, `--no-parallel`, `--no-evidence` |
| `/ac:maestro-qa` | Mobile QA testing — 5 modes (ad-hoc, bug-repro, plan-verify, recheck, flow-run), MCP-driven via Maestro CLI, parallel execution across devices, knowledge sharing. Auto-detects Maestro MCP. Flags: `--no-parallel`, `--no-evidence`, `--platform` |
| `/ac:flutter-qa` | Flutter QA testing — 6 modes (ad-hoc, bug-repro, plan-verify, recheck, test-run, visual-regression), MCP-driven via flutter-skill, parallel execution across sessions, knowledge sharing. Auto-detects flutter-skill MCP. Flags: `--no-parallel`, `--no-evidence`, `--platform`, `--uri` |
| `/ac:progress` | Show execution progress — active plans, task status, next action |

## Agents (ac plugin)

| Agent | `subagent_type` | Role |
|-------|-----------------|------|
| `explore` | `"ac:explore"` | Codebase search specialist — files, patterns, relationships. Returns file:line references |
| `librarian` | `"ac:librarian"` | External docs specialist — official docs via context7 MCP with WebSearch fallback |
| `linter` | `"ac:linter"` | LSP code intelligence verifier — diagnostics and symbol structure checks |
| `plan-analysis` | `"ac:plan-analysis"` | Plan quality auditor — pre-generation directives and post-generation gap/slop detection |
| `plan-review` | `"ac:plan-review"` | Adversarial plan reviewer — bias toward REJECT (OKAY/REJECT verdict) |
| `plan-verifier` | `"ac:plan-verifier"` | Post-execution plan compliance auditor (APPROVE/REJECT) |
| `plan-worker` | `"ac:plan-worker"` | Code implementation worker — executes single plan steps with self-contained briefings |
| `plan-code-review` | `"ac:plan-code-review"` | 2-stage code reviewer — spec compliance, then quality (APPROVED/BLOCKED) |
| `plan-deep-code-review` | `"ac:plan-deep-code-review"` | Deep cross-layer code review for complex plans — hidden coupling, caller impact, architectural compliance (APPROVED/BLOCKED) |
| `challenger` | `"ac:challenger"` | Devil's advocate for proposals and architecture decisions |
| `feasibility` | `"ac:feasibility"` | Feasibility evaluator — codebase fit, effort, dependencies |
| `security-reviewer` | `"ac:security-reviewer"` | OWASP-aware security scanner with severity×exploitability scoring |
| `code-simplifier` | `"ac:code-simplifier"` | Simplification advisor — preserves behavior, read-only, opt-in |
| `browser-qa` | `"ac:browser-qa"` | Browser test executor — Playwright CLI, captures evidence. Spawned by /ac:browser-qa |
| `maestro-qa` | `"ac:maestro-qa"` | Mobile test executor — Maestro MCP on iOS/Android. Spawned by /ac:maestro-qa |
| `flutter-qa` | `"ac:flutter-qa"` | Flutter test executor — flutter-skill MCP. Spawned by /ac:flutter-qa |

Model, effort, color, and tools are defined in each agent's frontmatter file.

16 agents total. Advisory agents enforce `disallowedTools: Write, Edit` as defense-in-depth. The execution agent (`plan-worker`) uses `disallowedTools: Agent, NotebookEdit` instead — it needs write access to implement code. `librarian`, `maestro-qa`, and `flutter-qa` use denylist-only (`disallowedTools:`) so MCP tools are auto-included without explicit allowlisting. Verification is layered/sequential: `plan-verifier` → `plan-code-review` → `plan-deep-code-review` — each layer gates the next, depth scales with plan complexity. Always use the `ac:` prefixed `subagent_type` — builtin `Explore` and `explore` route to different agents.

## Skills & MCP

### ac plugin
- `skill-creator` (Opus) — Create or improve Claude Code extension components. Has `references/` with templates
- `ac:browser-qa` skill (Sonnet, not user-invocable) — Browser QA workflow patterns and `playwright-cli` command routing. Has references/ for report format and evidence schema. Requires [Playwright CLI](https://github.com/microsoft/playwright-cli) (`npm install -g @playwright/cli@latest`)
- `ac:maestro-qa` skill (Sonnet, not user-invocable) — Mobile QA workflow patterns and Maestro MCP tool routing. Has references/ for report format and evidence schema. Requires [Maestro CLI](https://maestro.mobile.dev/) (`brew install maestro`) + user-installed MCP server
- `ac:flutter-qa` skill (Sonnet, not user-invocable) — Flutter QA workflow patterns and flutter-skill MCP tool routing. Has references/ for report format and evidence schema. Requires [flutter-skill](https://github.com/flutter-skill/flutter-skill) (`npm install -g flutter-skill`) + user-installed MCP server + `FlutterSkillBinding` in app
- `qa-patterns` reference (`plugins/ac/references/qa-patterns.md`) — Shared QA patterns across browser-qa, maestro-qa, flutter-qa (knowledge system, report format, parallel execution, evidence persistence)
- MCP: `context7` (user-installed) — Live documentation API via `@upstash/context7-mcp`

### github-cli plugin
- `github-cli` (Sonnet) — gh patterns for issues, PRs, releases, actions, gh api (REST + GraphQL), scripting

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

- **Multi-plugin marketplace**: Root is the catalog, each plugin is self-contained under `plugins/<name>/`
- **Model routing**: Haiku (search/fast), Sonnet (execution/analysis), Opus (planning/architecture/creation). Workers get per-step model based on tier (quick→Haiku, mid→Sonnet, senior→Opus) with auto-escalation on failure
- **Agent model customization**: Explore (default Haiku) and Librarian (default Sonnet) — override via Claude Code's native `ANTHROPIC_DEFAULT_HAIKU_MODEL` / `ANTHROPIC_DEFAULT_SONNET_MODEL` env vars. Model profiles: `quality` (all Opus) / `balanced` (default — Haiku/Sonnet/Opus per frontmatter) / `budget` (Sonnet+Haiku only) — configure via env vars
- **Progressive disclosure**: Metadata always loaded → SKILL.md body on trigger → references/ on demand
- **Read-only advisory**: Agents that advise never have write tools
- **Plan-first**: All commands follow classify → research → interview → generate → review → install
- **reliability-first**: Right model for right task — default Sonnet execution, Opus for planning/investigation/architecture
- **Foreground-first agent synchronization**: Parallel agents that must all complete before proceeding use foreground (default) — CC waits for all automatically. Background (`run_in_background: true`) only for genuinely independent work; when all agents have reported, proceed. Verification agents are always foreground. All parallel Agent calls must be in a single message block.
- **Layered verification**: Verification is sequential and gated — `plan-verifier` → `plan-code-review` → `plan-deep-code-review`. Each layer must APPROVE before the next runs. Depth scales with complexity: Simple (build+test only), Standard (plan-verifier + plan-code-review), Complex (all 3 layers, mandatory — cannot be bypassed). Commit preflight skipped via `--skip-preflight` when invoked by execute post-verification.
- **Complexity-driven verification**: Verification depth scales with plan complexity — Simple (build+test only), Standard (plan-verifier + plan-code-review, skip plan-deep-code-review), Complex (full layered verification, mandatory — cannot be bypassed by --loop or any flag). Build+test and verification agents launch as foreground in a single message block.
- **Pre-generation analysis**: Metis-inspired gap detection — plan-analysis agent runs in pre-generation mode to catch hidden intentions and AI-slop risks before plan writing. Post-gen analysis runs in parallel with Deep Review (plan-review) — mandatory for Complex, opt-in for Standard.
- **Subagent-only architecture**: All agents use subagent model (fresh context, custom model/tools). Fork model (inherits parent context + prompt cache) is cheaper but requires `model: inherit` (breaks model routing) and `tools: ['*']` (breaks read-only advisory). Use fork only when child needs full parent context AND same model AND no tool restriction
- **Conditional MCP routing**: Agents detect MCP tool availability at runtime — graceful fallback when tools not installed. All MCP servers are user-installed, not bundled (e.g., maestro MCP for mobile QA, flutter-skill MCP for Flutter QA)
- **Tiered code search**: Grep (text) → LSP (semantic). Agents use LSP via code intelligence for structural queries when available.
- **Project-local storage**: Plans saved to `.ac/plans/`, tasks to `.ac/tasks/`, QA evidence to `.ac/qa/`, browser-qa state to `.ac/browser-qa/`, maestro-qa state to `.ac/maestro-qa/`, flutter-qa state to `.ac/flutter-qa/`, visual regression baselines to `.ac/qa/baselines/` in the working directory. Not gitignored by default — each project decides
- **Auto commit+push**: Orchestrators (execute, ideate) invoke `/ac:commit` after task completion to commit and push changes
- **Ad-hoc parallel execution**: `/ac:work` provides plan-free parallel execution for multi-file tasks. Decomposes requests into independent tasks with file ownership validation, routes each to correct model tier (quick→Haiku, mid→Sonnet, senior→Opus), fires simultaneously, and runs complexity-driven verification. For structured multi-step work with dependencies, use `/ac:plan` + `/ac:execute` instead
- **Global CLAUDE.md dedup boundary**: Command prompts must not duplicate directives already in the global CLAUDE.md template (Intent Gate, Delegation Check, Research delegation, Verification, AskUserQuestion enforcement, barrier semantics). These load every message. Commands specify WHAT to do (which agents, which prompts), not HOW CC should behave. Worker templates for subagents are exempt — subagents don't receive global CLAUDE.md.
- **Project context propagation**: Subagents don't receive CLAUDE.md by design (CC's `userContext: {}` for subagents). ac compensates with a hybrid extraction pipeline:
  - **Plan-time** (`plan.md`): Reads CLAUDE.md + CLAUDE.local.md + `.claude/rules/` + `my-coding` skill → extracts into `PROJECT_CONTEXT` → merges into plan's `### Conventions` section (required)
  - **Execute-time** (`execute.md`): Reads CLAUDE.md fresh → extracts build/test/lint commands + gotchas as `RUNTIME_CONTEXT` (deduplicated against `PLAN_CONVENTIONS`) → injected into worker prompts (compact for quick tier, full for mid/senior)
  - **Verification-time** (`execute.md` Phase 5): `PLAN_CONVENTIONS` + `RUNTIME_CONTEXT` passed to plan-code-review and plan-verifier agent prompts for convention compliance checking
  - **Ideation-time** (`ideate.md`): Reads CLAUDE.md → extracts as `PROJECT_CONVENTIONS` → injected into challenger and feasibility agent prompts
  - **Codebase State**: Plan classifies target area (Disciplined/Transitional/Legacy/Chaotic) → execute uses for tier escalation (Chaotic/Legacy auto-escalates quick→mid)

## Key Files

- `plugins/ac/skills/skill-creator/references/prompt-patterns.md` — Pattern library for writing Claude Code components
- `plugins/ac/agents/plan-worker.md` — Code implementation worker agent (kodizm 5-section format)
- `plugins/ac/agents/plan-deep-code-review.md` — Deep cross-layer code review agent for complex plans
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
- Commands delegate to `skill-creator` for file generation — they don't write files directly
- Plugin-level `plugin.json` is minimal (3 fields) — version, category, tags live only in root `marketplace.json`
- CC subagents receive `userContext: {}` (no CLAUDE.md) by design — ac's context propagation pipeline compensates by extracting and injecting project rules at plan/execute/verify time via prompt variables (PROJECT_CONTEXT, PLAN_CONVENTIONS, RUNTIME_CONTEXT)
- Global CLAUDE.md template directives (Intent Gate, Delegation Check, barriers, AskUserQuestion enforcement) load every message — don't repeat them in command prompts. Worker templates for subagents are the exception (they don't receive CLAUDE.md).
