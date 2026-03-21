# ac

**A structured development partner for Claude Code.**

`ac` learns how you code, how you write, and how you think about architecture — then applies that knowledge to every task. It plans before coding, researches before asking, delegates to specialized agents, and never forgets your conventions.

## Introduction

Claude Code is powerful out of the box. But without structure, it burns tokens on false starts, scope creep, and redundant exploration. `ac` fixes that with a simple principle: **plan first, code second**.

Every non-trivial task flows through a structured pipeline — classify the intent, research the codebase, interview for ambiguities, generate a plan with acceptance criteria, execute with the right model for each step, and verify before committing. The entire workflow is automated. You describe what you want, `ac` handles the rest.

```
You: /ac:plan add rate limiting to the payment API
ac:  Classifies → researches codebase → interviews you → generates plan
You: approve
ac:  Executes steps in parallel → verifies → commits
```

No wasted cycles. No wrong approaches. No forgotten edge cases.

## Installation

```bash
claude plugin add anilcancakir/claude-code-plugin
```

## Quick Start

### 1. Teach It Your Style

Before anything else, let `ac` learn how you work. These one-time commands scan your existing projects and writing to create personalized skills:

```bash
# Analyzes 1-3 of your projects — naming, architecture, formatting, testing preferences
/ac:setup-coding

# Analyzes your docs, articles, commit messages — voice, tone, structure
/ac:setup-language

# Detects your environment, skills, MCP servers — generates orchestration config
/ac:setup-global-claude-md
```

After this, Claude Code knows your conventions and applies them automatically in every session.

### 2. Set Up Your Project

Run these in each project directory. They analyze the actual codebase — no generic templates:

```bash
# Discovers commands, architecture, conventions → generates ./CLAUDE.md
/ac:init-claude-md

# Detects tech stacks, extracts conventions → generates .claude/rules/
/ac:init-rules
```

### 3. Start Building

```bash
# Plan a feature
/ac:plan add user avatar upload with S3 storage

# Execute the approved plan
/ac:execute avatar-upload

# Commit with preflight checks
/ac:commit
```

That's it. Three commands for the entire development cycle.

## Usage Examples

### Planning a Feature

```bash
/ac:plan add Stripe webhook handler for subscription events
```

`ac` classifies this as a "Build" intent, launches research agents to scan your codebase for existing payment patterns, then interviews you:

```
ac: Found existing Stripe integration in app/Services/StripeService.php.
    Three questions before I plan:

    1. Which subscription events should we handle?
       → checkout.session.completed, customer.subscription.updated, invoice.payment_failed

    2. Should failed webhooks retry or dead-letter?
       → Retry 3 times with exponential backoff

    3. How should we verify webhook signatures?
       → Use Stripe's built-in signature verification
```

After the interview, `ac` generates a plan with acceptance criteria, tier assignments for each step, and QA scenarios. You review and approve — then `/ac:execute` takes over.

### Investigating a Bug

```bash
/ac:plan debug why order emails stopped sending after the queue refactor
```

`ac` classifies this as an "Investigation" intent and launches an `ac:investigate` agent (Opus, hypothesis-driven, 3-cycle ceiling). The investigator traces the issue across files, forms hypotheses, and returns structured findings with root cause and evidence. Then `ac` builds a fix plan from the investigation results.

### Refining an Idea

```bash
/ac:ideate add a recommendation engine based on user purchase history
```

`ac` runs a Socratic interview with mathematical ambiguity scoring. It challenges your assumptions, evaluates feasibility against your codebase, and produces a mature concept document with gaps, risks, and alternatives. When you're satisfied:

```
ac: Ambiguity score dropped from 73% to 12%. Ready to plan?
    → Yes, plan it
    → Save as PRD for later
    → Plan and execute automatically (--loop)
```

### Batch Processing Ideas

```bash
/ac:ideate --bulk
```

Paste meeting notes, a list of feature requests, or customer feedback. `ac` triages everything into prioritized tasks with size estimates, ready for planning.

### Full Autopilot

```bash
/ac:ideate add dark mode support --loop
```

The `--loop` flag chains ideation → planning → execution automatically. `ac` refines the idea, generates a plan, executes it, runs verification, and commits — all without interruption.

## Commands

### Daily Workflow

| Command | What It Does |
|---------|-------------|
| `/ac:plan <task>` | Research → interview → generate actionable plan with acceptance criteria |
| `/ac:execute <plan>` | Execute plan — parallel agents for independent steps, sequential for dependent ones |
| `/ac:commit` | Preflight checks (lint + tests) → convention detection → atomic commits → push |
| `/ac:ideate <idea>` | Socratic refinement → adversarial challenge → Jira-ready tasks. Flags: `--bulk`, `--loop` |

### Project Setup

| Command | What It Does |
|---------|-------------|
| `/ac:init-claude-md` | Discover codebase → interview → generate project `CLAUDE.md` |
| `/ac:init-rules` | Analyze conventions → score directories → generate `.claude/rules/` |

### Personal Setup

| Command | What It Does |
|---------|-------------|
| `/ac:setup-coding` | Scan your projects → interview → generate `my-coding` skill |
| `/ac:setup-language` | Scan your writing → interview → generate `my-language` skill |
| `/ac:setup-global-claude-md` | Detect skills + MCP → interview → generate `~/.claude/CLAUDE.md` |

> **Updating after plugin changes**: Run `/ac:setup-global-claude-md update`, `/ac:init-claude-md update`, or `/ac:init-rules update` to sync with new features while preserving your preferences.

## How the Pipeline Works

### Plan → Execute → Verify → Commit

Every task follows the same pipeline. The depth scales with complexity:

```
/ac:plan "add rate limiting"
  │
  ├─ Classify: Build intent, Standard complexity
  ├─ Research: 1 explore agent scans codebase
  ├─ Interview: 2-3 targeted questions
  ├─ Plan: Steps with tier assignments (quick/mid/senior)
  │
  └─ /ac:execute rate-limiting
       │
       ├─ Wave 1: Independent steps run in parallel
       │   ├─ Step 1 (quick → Haiku): Create migration
       │   ├─ Step 2 (mid → Sonnet): Implement middleware
       │   └─ Step 3 (mid → Sonnet): Write tests
       │
       ├─ Wave 2: Dependent steps run after Wave 1
       │   └─ Step 4 (senior → Opus): Integration + edge cases
       │
       ├─ Verification Wave:
       │   ├─ Build + test suite
       │   ├─ Code reviewer (spec compliance + quality)
       │   └─ Linter (LSP diagnostics)
       │
       └─ /ac:commit --skip-preflight
            └─ Atomic commit → push
```

### Pipeline Profiles

Complexity classification controls how many agents spawn and which gates run:

| Profile | Research | Pre-gen Analysis | Verification | Total Agents |
|---------|----------|-----------------|--------------|-------------|
| **Simple** | Direct Read (0 agents) | Skip | Build + test only | ~2-3 |
| **Standard** | 1 explore agent | Skip | Code reviewer + linter | ~4-6 |
| **Complex** | 2-3 explore + librarian | Metis mode | Full wave + optional security | ~7-10 |

A simple rename spawns 2-3 agents and completes in minutes. A complex architecture change gets the full multi-agent treatment with adversarial review.

### Model Routing

Each plan step carries a tier assignment. `/ac:execute` routes workers to the right model automatically:

| Tier | Model | When |
|------|-------|------|
| `quick` | Haiku | Mechanical tasks — migrations, config changes, simple renames |
| `mid` | Sonnet | Standard implementation — business logic, tests, refactoring |
| `senior` | Opus | Cross-layer changes — architecture, complex integrations, edge cases |

Failed agents escalate one tier before giving up (quick → Sonnet, mid → Opus). The default is correctness, not cost savings.

## Agents

`ac` includes 13 specialized agents. All are **read-only** — advisory agents never have write tools. Each agent runs as a fresh subagent with its own model, tools, and context.

### Search & Research

| Agent | Model | Purpose |
|-------|-------|---------|
| `ac:explore` | Haiku | Fast codebase search — files, patterns, relationships |
| `ac:librarian` | Sonnet | External docs lookup — context7 MCP first, WebSearch fallback |

### Planning & Review

| Agent | Model | Purpose |
|-------|-------|---------|
| `ac:plan-analysis` | Opus | Plan quality gate — catches hidden intentions, scope gaps, AI-slop |
| `ac:plan-review` | Opus | Adversarial reviewer — bias toward REJECT, stress-tests executability |
| `ac:challenger` | Opus | Devil's advocate — finds gaps, risks, and blind spots in proposals |
| `ac:feasibility` | Sonnet | Pragmatic evaluator — codebase fit, effort, dependencies |

### Verification & Quality

| Agent | Model | Purpose |
|-------|-------|---------|
| `ac:code-reviewer` | Sonnet | 2-stage review — spec compliance, then code quality with confidence scoring |
| `ac:verifier` | Opus | Post-execution compliance audit — checks every "done when" criterion |
| `ac:linter` | Haiku | LSP diagnostics — interprets `<new-diagnostics>`, navigation checks |
| `ac:security-reviewer` | Opus | OWASP Top 10 scanner — severity x exploitability scoring. Optional |
| `ac:code-simplifier` | Opus | Clarity pass — suggests simplifications preserving behavior. Opt-in |

### Investigation

| Agent | Model | Purpose |
|-------|-------|---------|
| `ac:investigate` | Opus | Root cause analysis — hypothesis-driven, 3-cycle ceiling, structured evidence |
| `ac:gemini-vision` | Sonnet | Multimodal analysis — video recordings, multi-image comparison via Gemini |

## Model Customization

Override default agent models using Claude Code's native environment variables:

```bash
# Upgrade all Haiku agents (explore, linter) to Sonnet
export ANTHROPIC_DEFAULT_HAIKU_MODEL=claude-sonnet-4-6

# Upgrade all Sonnet agents (librarian, feasibility, code-reviewer) to Opus
export ANTHROPIC_DEFAULT_SONNET_MODEL=claude-opus-4-6
```

Or set it in `~/.claude/settings.json`:

```json
{
  "env": {
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "claude-sonnet-4-6"
  }
}
```

Three profiles emerge from these overrides:

| Profile | Haiku Agents | Sonnet Agents | Opus Agents | Use Case |
|---------|-------------|---------------|-------------|----------|
| **Budget** | Haiku | Sonnet | Sonnet | Cost-sensitive, simple projects |
| **Balanced** | Haiku | Sonnet | Opus | Default — right model for each tier |
| **Quality** | Sonnet | Opus | Opus | Critical projects, maximum accuracy |

## Optional MCP Integrations

Agents detect installed MCP servers at runtime and use them automatically. When not installed, agents fall back to standard tools. No configuration needed.

### context7 — Live Documentation

The **librarian** agent queries context7 for version-aware library docs before falling back to WebSearch. Faster and more accurate than web scraping.

```bash
claude mcp add context7 -- npx -y @upstash/context7-mcp
```

### gemini-cli — Gemini Bridge

Bridges Claude to Gemini's 1M token window and multimodal capabilities. Used by **gemini-vision** (visual analysis), **plan-analysis** (second-eye review), and **librarian** (large context research).

```bash
npm install -g gemini-mcp-tool
claude mcp add gemini-cli -- gemini-mcp-tool
```

### skillsmp — Skill Marketplace

Search, discover, and install AI coding skills from [SkillsMP](https://skillsmp.com).

```bash
npm install -g skillsmp-mcp-server
claude mcp add skillsmp-mcp-server -- skillsmp-mcp-server
```

> Requires a `SKILLSMP_API_KEY` from [skillsmp.com](https://skillsmp.com).

## Companion Plugins

`ac` is part of a multi-plugin marketplace. Install companion plugins for specialized capabilities:

| Plugin | What It Adds |
|--------|-------------|
| `github-cli` | Comprehensive `gh` CLI reference — issues, PRs, releases, actions, API |
| `git-master` | Git expert — atomic commits, interactive rebase, history archaeology |
| `frontend-design` | Production-grade UI — design systems, hierarchy, color, mobile patterns |
| `ac-designer` | Stitch UI design orchestrator — layout, page generation, consistency audit |
| `dart-lsp` | Dart/Flutter language server — go-to-definition, diagnostics |
| `json-lsp` | JSON language server — schema validation, hover |
| `yaml-lsp` | YAML language server — schema validation, diagnostics |
| `markdown-lsp` | Markdown language server — link navigation, document symbols |

When `git-master` is installed, `/ac:commit` automatically delegates to it for intelligent commit splitting and style detection.

## Troubleshooting

### Background Agents Not Working

If parallel agents don't produce visible progress, ensure these experimental flags are enabled:

```json
// ~/.claude/settings.json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1",
    "CLAUDE_CODE_ENABLE_TASKS": "true"
  }
}
```

`/ac:execute` validates these before launching parallel agents. If missing, it falls back to sequential foreground execution automatically.

### Plugin Not Loading After Update

Restart Claude Code after updating the plugin. Some changes (new commands, agents) require a fresh session to take effect.

## Design Philosophy

- **Plan-first** — All commands follow: classify → research → interview → generate → review. No code is written during planning
- **Reliability-first** — Default to correctness, not cost savings. Opus handles planning and architecture, Haiku handles search. Failed agents escalate one tier before logging failure
- **Progressive disclosure** — Plugin metadata is always in context. SKILL.md body loads on trigger. Reference files load on demand. Tokens are injected only when relevant
- **Read-only advisory** — All 13 agents enforce `disallowedTools: Write, Edit`. Only execution workers spawned by `/ac:execute` get write access
- **Pure markdown** — Every component is YAML frontmatter + markdown. No compiled code, no runtime dependencies, no vendor lock-in

## Plugin Structure

```
plugins/ac/
├── commands/          # 9 user-invocable /ac:* commands
├── agents/            # 13 read-only agent definitions
├── skills/
│   └── ac-skill-creator/
│       ├── SKILL.md
│       └── references/    # Templates for coding style, language style, CLAUDE.md, PRDs
├── .claude-plugin/
│   └── plugin.json
└── README.md
```

## License

MIT
