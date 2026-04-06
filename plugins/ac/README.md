# ac

**Claude Code that plans before it codes.**

Install `ac`, set it up once, then just talk. Say "add rate limiting" and it researches your codebase, asks the right questions, writes a plan, executes it with the right model for each step, verifies everything, and commits.

```
You: add Stripe webhook handler for subscription events
ac:  [researches codebase] → [asks 3 questions] → [plans 4 steps] → [executes in parallel] → [verifies] → [commits]

You: why did emails stop after the queue refactor?
ac:  [investigates across 12 files] → [finds root cause] → [plans fix] → [executes] → [done]

You: explain how the auth middleware works
ac:  [spawns search agents] → [traces call chain] → [returns annotated explanation]
```

No slash commands needed. No manual routing. Just talk.

## Install

```bash
claude plugin add anilcancakir/claude-code-plugin
```

## Setup (one-time)

```bash
# 1. Teach it your coding style (scans your projects)
/ac:setup-coding

# 2. Generate your brain file (the most important step)
/ac:setup-global-claude-md

# 3. Set up your project
/ac:init-claude-md
/ac:init-rules
```

After step 2, Claude Code knows how to route every request automatically. After step 3, it knows your project's architecture, commands, and conventions.

**That's it.** Start talking naturally.

## How It Works

`ac` generates a `~/.claude/CLAUDE.md` that loads every session. It teaches Claude Code one simple rule: **classify intent, then delegate**.

| You say | What happens |
|---------|-------------|
| "add X", "create Y" | Researches codebase → plans → executes with parallel agents → verifies → commits |
| "why does X fail" | Hypothesis-driven investigation → root cause → fix plan |
| "restructure X" | Plans refactor with dependency analysis → parallel execution |
| "how does X work" | Spawns search agents → returns annotated explanation |
| "fix X" (known cause) | Direct fix → verify with tests |

### The Pipeline

Every non-trivial task follows: **plan → execute → verify → commit**.

```
/ac:plan "add rate limiting"
  ├── Research: agents scan codebase for existing patterns
  ├── Interview: 2-3 targeted questions
  └── Plan: steps with tier assignments

/ac:execute rate-limiting
  ├── Wave 1 (parallel): migration (Haiku) + middleware (Sonnet) + tests (Sonnet)
  ├── Wave 2 (sequential): integration + edge cases (Opus)
  ├── Verify: compliance audit + code review + linter
  └── Commit
```

Three model tiers — the right model for each step:

| Tier | Model | For |
|------|-------|-----|
| quick | Haiku | Config, migrations, boilerplate |
| mid | Sonnet | Business logic, tests, standard work |
| senior | Opus | Architecture, cross-layer, complex edge cases |

Failed steps automatically retry with a higher-tier model before giving up.

## Commands

### Daily

| Command | Purpose |
|---------|---------|
| `/ac:plan` | Research → interview → generate plan |
| `/ac:execute` | Execute plan with parallel agents |
| `/ac:commit` | Preflight checks → atomic commit → push |
| `/ac:ideate` | Refine vague ideas into plannable tasks. `--bulk` for batch, `--loop` for autopilot |

### Testing

| Command | Purpose |
|---------|---------|
| `/ac:browser-qa` | Browser tests via [Playwright CLI](https://github.com/microsoft/playwright-cli) |
| `/ac:maestro-qa` | Mobile tests via [Maestro](https://maestro.mobile.dev/) MCP |
| `/ac:flutter-qa` | Flutter tests via [flutter-skill](https://github.com/flutter-skill/flutter-skill) MCP |

### Setup

| Command | Purpose |
|---------|---------|
| `/ac:setup-coding` | Scan projects → generate coding style skill |
| `/ac:setup-language` | Scan writing → generate language style skill |
| `/ac:setup-global-claude-md` | Generate global orchestration config |
| `/ac:init-claude-md` | Generate project CLAUDE.md |
| `/ac:init-rules` | Generate path-scoped `.claude/rules/` |

> Run setup commands with `update` to sync after plugin updates: `/ac:setup-global-claude-md update`

## Companion Plugins

| Plugin | What it adds |
|--------|-------------|
| `github-cli` | `gh` CLI reference — issues, PRs, releases, actions |
| `github-actions` | GitHub Actions workflows — CI/CD, releases, Docker, security |
| `git-master` | Atomic commits, rebase, history archaeology |
| `frontend-design` | Design systems, hierarchy, color, mobile patterns |
| `dart-lsp` | Dart/Flutter language server |
| `json-lsp` / `yaml-lsp` / `markdown-lsp` | Schema validation and diagnostics |

## Optional: MCP Integrations

Agents detect MCP servers at runtime. Install what you need:

```bash
# Live docs for libraries/frameworks (used by librarian agent)
claude mcp add context7 -- npx -y @upstash/context7-mcp

# Skill marketplace
npm install -g skillsmp-mcp-server
claude mcp add skillsmp-mcp-server -- skillsmp-mcp-server
```

## Pure Markdown

Every component is YAML frontmatter + markdown. No compiled code, no runtime dependencies. 15 agents, 12 commands, all text files you can read and modify.

## License

MIT
