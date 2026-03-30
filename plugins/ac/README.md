# ac

**A structured development partner for Claude Code.**

`ac` learns how you code, how you write, and how you think about architecture — then applies that knowledge to every task. It plans before coding, researches before asking, delegates to specialized agents, and never forgets your conventions.

## Introduction

Claude Code is powerful out of the box. But without structure, it burns tokens on false starts, scope creep, and redundant exploration. `ac` fixes that with a simple principle: **plan first, code second**.

The key insight: once you set up `ac`, you don't need to remember commands. Just talk naturally.

```
You: add rate limiting to the payment API
ac:  [Build intent detected] → researches codebase → interviews you → generates plan → executes → verifies → commits

You: why are order emails failing since the queue refactor?
ac:  [Investigation intent detected] → spawns Opus investigator → traces root cause → plans fix

You: explain how the auth middleware works
ac:  [Research intent detected] → spawns explore agents → returns annotated explanation
```

No slash commands needed. No manual routing. `ac` reads your intent and picks the right workflow automatically.

### How? The Global CLAUDE.md

When you run `/ac:setup-global-claude-md`, `ac` generates a `~/.claude/CLAUDE.md` file that acts as Claude Code's **brain**. This file loads at the start of every session and teaches Claude Code how to think:

**Intent Gate** — Before touching any tool, Claude Code classifies what you're asking:

| You Say | Intent | What Happens |
|---------|--------|-------------|
| "add X", "create Y", "implement Z" | Build | Triggers `/ac:plan` → `/ac:execute` automatically |
| "restructure X", "clean up Y" | Refactor | Same plan-first pipeline |
| "why does X fail", "debug Y" | Investigation | Spawns `ac:investigate` (Opus, hypothesis-driven) |
| "fix X" (known cause) | Fix | Direct fix → verify with tests |
| "how does X work", "explain Y" | Research | Spawns `ac:explore` + `ac:librarian` agents |
| "review X", "audit Y" | Evaluation | Explore agents + inline analysis |

**Delegation Check** — Default bias is DELEGATE. Before acting on anything non-trivial:
1. Specialized agent handles this? → Spawn it
2. Matching skill covers this? → Invoke it
3. Super simple (single file, <10 lines)? → Execute directly

This means `ac` works in the background even when you're just chatting with Claude Code. Say "add dark mode support" and the plan-execute pipeline kicks in. Say "why is this test flaky" and an Opus investigator starts tracing hypotheses. No ceremony required.

> You can still use slash commands directly (`/ac:plan`, `/ac:execute`) when you want explicit control. The auto-routing is a convenience layer, not a replacement.

## Installation

```bash
claude plugin add anilcancakir/claude-code-plugin
```

## Quick Start

### 1. Teach It Your Style (one-time)

These commands scan your existing projects and writing to create personalized skills. Run them once — they persist across all sessions.

```bash
# Scans 1-3 of your projects — learns your naming, architecture, testing preferences
/ac:setup-coding

# Analyzes your docs, articles, commit messages — learns your voice and tone
/ac:setup-language
```

### 2. Generate Your Brain File (one-time)

This is the most important step. It generates `~/.claude/CLAUDE.md` — the file that teaches Claude Code how to route your requests automatically.

```bash
/ac:setup-global-claude-md
```

This command detects your environment, installed skills, and MCP servers. It interviews you on communication style and autonomy level. The output is a compact orchestration config (~120 lines) that loads at the start of every Claude Code session.

After this step, you can just talk naturally. The Intent Gate handles the rest.

### 3. Set Up Your Project (per project)

Run these in each project directory. They analyze the actual codebase — no generic templates:

```bash
# Discovers architecture, conventions → generates ./CLAUDE.md
/ac:init-claude-md

# Detects tech stacks, extracts conventions → generates .claude/rules/
/ac:init-rules
```

### 4. Start Building

Once setup is complete, just describe what you want:

```bash
# These all trigger the plan-execute pipeline automatically:
add user avatar upload with S3 storage
refactor the notification service to use events
add rate limiting to public API endpoints

# Or use commands directly for explicit control:
/ac:plan add avatar upload
/ac:execute avatar-upload
/ac:commit
```

That's it. Setup once, then talk naturally.

## Usage Examples

### Building a Feature

You say:

```
add Stripe webhook handler for subscription events
```

The Intent Gate classifies this as **Build**. `ac` launches explore agents, finds your existing Stripe integration, and interviews you:

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

After the interview, `ac` generates a plan with acceptance criteria and tier assignments, executes it with parallel agents, runs verification, and commits. You approve the plan once — the rest is automatic.

### Investigating a Bug

You say:

```
why did order emails stop sending after the queue refactor?
```

The Intent Gate classifies this as **Investigation** (hairy — unknown cause, multi-file). `ac` spawns an `ac:investigate` agent on Opus with a 3-cycle ceiling. The investigator:

1. Forms hypotheses ("queue connection name changed", "event listener not registered")
2. Traces code paths across files to confirm or eliminate each hypothesis
3. Returns structured findings with root cause, evidence, and affected files

Then `ac` automatically builds a fix plan from the investigation results. No guessing, no premature fixes.

### Refining a Vague Idea

You say:

```
I want some kind of recommendation engine based on purchase history
```

The Intent Gate routes this to `/ac:ideate`. `ac` runs a Socratic interview — each question targets the vaguest part of your idea. It tracks ambiguity mathematically:

```
ac: Ambiguity score: 73% → asking about data sources...
ac: Ambiguity score: 41% → asking about algorithm approach...
ac: Ambiguity score: 12% → concept is clear. Ready to plan?
    → Yes, plan it
    → Save as PRD for later
    → Plan and execute automatically (--loop)
```

The output is a mature concept document with gaps, risks, alternatives, and Jira-ready task breakdowns.

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

> Most commands trigger automatically through the Intent Gate. Use them directly when you want explicit control over a specific step.

### Daily Workflow

| Command | What It Does |
|---------|-------------|
| `/ac:plan <task>` | Research → interview → generate actionable plan with acceptance criteria |
| `/ac:execute <plan>` | Execute plan — parallel agents for independent steps, sequential for dependent ones |
| `/ac:commit` | Preflight checks (lint + tests) → convention detection → atomic commits → push |
| `/ac:ideate <idea>` | Socratic refinement → adversarial challenge → Jira-ready tasks. Flags: `--bulk`, `--loop` |
| `/ac:browser-qa` | Browser QA testing — 4 modes (ad-hoc, bug-repro, plan-verify, recheck). Evidence saved to `.ac/qa/`. Flag: `--no-evidence` |

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

`ac` includes 14 specialized agents. All are **read-only** — advisory agents never have write tools. Each agent runs as a fresh subagent with its own model, tools, and context.

### Search & Research

| Agent | Model | Purpose |
|-------|-------|---------|
| `ac:explore` | Haiku | Fast codebase search — files, patterns, relationships |
| `ac:librarian` | Sonnet | External docs lookup — context7 MCP first, WebSearch fallback |

### Planning & Review

| Agent | Model | Purpose |
|-------|-------|---------|
| `ac:plan-analysis` | Sonnet | Plan quality gate — catches hidden intentions, scope gaps, AI-slop |
| `ac:plan-review` | Opus | Adversarial reviewer — bias toward REJECT, stress-tests executability |
| `ac:challenger` | Opus | Devil's advocate — finds gaps, risks, and blind spots in proposals |
| `ac:feasibility` | Sonnet | Pragmatic evaluator — codebase fit, effort, dependencies |

### Verification & Quality

| Agent | Model | Purpose |
|-------|-------|---------|
| `ac:code-reviewer` | Sonnet | 2-stage review — spec compliance, then code quality with confidence scoring |
| `ac:verifier` | Sonnet | Post-execution compliance audit — checks every "done when" criterion |
| `ac:linter` | Haiku | LSP diagnostics — interprets `<new-diagnostics>`, navigation checks |
| `ac:security-reviewer` | Sonnet | OWASP Top 10 scanner — severity x exploitability scoring. Optional |
| `ac:code-simplifier` | Sonnet | Clarity pass — suggests simplifications preserving behavior. Opt-in |

### Investigation & Testing

| Agent | Model | Purpose |
|-------|-------|---------|
| `ac:investigate` | Opus | Root cause analysis — hypothesis-driven, 3-cycle ceiling, structured evidence |
| `ac:gemini-vision` | Sonnet | Multimodal analysis — video recordings, multi-image comparison via Gemini |
| `ac:browser-qa` | Sonnet | Browser test executor — runs tests via Playwright CLI shell commands, captures screenshots + HTML + errors, returns structured verdicts |

## Browser QA Testing

`/ac:browser-qa` runs browser-based tests via Playwright CLI. It orchestrates the full flow: detect CLI → classify mode → gather context → delegate to `ac:browser-qa` agent → generate report → persist evidence.

### Modes

| Mode | Trigger | Description |
|------|---------|-------------|
| **Ad-hoc** | URL or instructions | Navigate and test freeform |
| **Bug repro** | `--bug <path>` | Reproduce bugs from a document |
| **Plan verify** | `--plan <path>` | Verify plan acceptance criteria |
| **Re-check** | `--recheck` | Re-run previously failed tests |

### Evidence Persistence

By default, test artifacts are saved to `.ac/qa/` for audit trail and debugging:

```
.ac/qa/{testName}/
  {YYYYMMDD}-{HHmmss}-{pagePath}.png    # Screenshots (on FAIL)
  {YYYYMMDD}-{HHmmss}-{pagePath}.html   # Page HTML snapshots
  {YYYYMMDD}-{HHmmss}-{pagePath}.json   # Console + network errors
  report.md                              # Latest report
```

Disable with `--no-evidence`.

### Required: Playwright CLI

```bash
npm install -g @playwright/cli@latest
```

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

Bridges Claude to Gemini's 1M token window and multimodal capabilities. Used by **gemini-vision** (visual analysis), **plan-review** (adversarial second-eye), and **librarian** (large context research).

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
- **Read-only advisory** — All 14 agents enforce `disallowedTools: Write, Edit`. Only execution workers spawned by `/ac:execute` get write access
- **Pure markdown** — Every component is YAML frontmatter + markdown. No compiled code, no runtime dependencies, no vendor lock-in

## Plugin Structure

```
plugins/ac/
├── commands/          # 10 user-invocable /ac:* commands (incl. browser-qa)
├── agents/            # 14 read-only agent definitions (incl. browser-qa)
├── skills/
│   ├── ac-skill-creator/
│   │   ├── SKILL.md
│   │   └── references/    # Templates for coding style, language style, CLAUDE.md, PRDs
│   └── browser-qa/
│       ├── SKILL.md       # Browser QA workflow patterns, Playwright CLI routing, self-healing
│       └── references/    # Report format and evidence schema
├── .claude-plugin/
│   └── plugin.json
└── README.md
```

## License

MIT
