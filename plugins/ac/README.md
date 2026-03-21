# ac

**A structured development partner for Claude Code.**

`ac` learns how you code, how you write, and how you think about architecture — then applies that knowledge to every task. It plans before coding, researches before asking, delegates to specialized agents, and never forgets your conventions.

Built on a **reliability-first architecture** inspired by Sisyphus-quality workflows — every task goes through pre-generation analysis, parallel research, tier-routed execution, and a mandatory verification wave before commit. When complexity spikes, Opus agents step in for planning, deep investigation, and architecture. Plan steps carry **tier assignments** (quick/mid/senior) so `/ac:execute` routes each worker to Haiku, Sonnet, or Opus automatically. **Pipeline Profiles** (Lean/Standard/Full) scale agent spawns with complexity — a Simple plan spawns ~2-3 agents and completes in minutes, Standard gets ~4-6, Complex gets the full ~7-10 multi-agent treatment. **Structured workflows that never skip the gate.**

## Why This Plugin

Claude Code is powerful out of the box, but without structure it burns tokens on false starts, scope creep, and redundant exploration. `ac` fixes that:

- **It knows your style** — Analyzes your existing projects and writing to create personal `my-coding` and `my-language` skills that load automatically
- **It plans before it codes** — Every non-trivial task goes through classify, research, interview, plan. No wasted cycles on wrong approaches
- **It delegates intelligently** — Pipeline Profiles scale agent spawns with complexity: Simple plans skip research agents entirely (direct Read), Standard uses 1 explore agent, Complex gets 2-3 explore + librarian. Each plan step gets tier-assigned (quick/mid/senior) and routed to Haiku/Sonnet/Opus automatically at execution time. Anti-duplication wisdom propagates discovered conventions to subsequent workers
- **It scaffolds from reality** — Auto-generates `CLAUDE.md` and `.claude/rules/` from actual codebase analysis, not generic templates
- **It's token-efficient** — Progressive disclosure loads context only when needed. Path-scoped rules inject only for matching files
- **It's built on official patterns** — Pure markdown on Claude Code's native extension points (agents, skills, commands, rules, MCP). No custom runtime, no vendor lock-in

## Getting Started

### Step 1: Personal Setup (one-time)

These commands analyze your existing code and writing to create personalized skills.

**1a. Create your coding style skill**

```
/ac:setup-coding
```

Scans 1-3 of your representative projects, interviews you on naming, architecture, formatting, and testing preferences. Generates `~/.claude/skills/my-coding/` — your personal coding rulebook.

**1b. Create your writing style skill**

```
/ac:setup-language
```

Analyzes your existing documentation, articles, or commit messages. Interviews you on voice, tone, and structure. Generates `~/.claude/skills/my-language/` — your personal writing guide.

**1c. Generate your global CLAUDE.md**

```
/ac:setup-global-claude-md
```

Detects your environment, active marketplace plugin skills, and all global MCP servers. Interviews you on communication style, autonomy level, and non-negotiable rules. Generates `~/.claude/CLAUDE.md` — your orchestration config that references the skills from steps 1a-1b and any installed plugin skills.

### Step 2: Project Setup (per project)

Run these in each project directory. They analyze the actual codebase — no generic templates.

**2a. Generate project CLAUDE.md**

```
/ac:init-claude-md
```

Launches 3 parallel agents to discover commands, architecture, and conventions. Interviews you to validate findings. Generates a token-budgeted `./CLAUDE.md` that is additive to your global config (no duplication).

**2b. Generate path-scoped rules**

```
/ac:init-rules
```

Scores directories by complexity, detects tech stacks, extracts conventions from source code. Generates `.claude/rules/*.md` with path globs — rules inject only when matching files are touched.

### Step 3: Daily Workflow

Once setup is complete, use the plan-execute loop for development.

```
/ac:plan <describe your task>
```

Claude classifies the request, launches research agents, interviews you on ambiguities, and produces an actionable plan with acceptance criteria. Then:

```
/ac:execute <plan-name>
```

Decomposes the plan into independent work units and executes them — parallel background agents for independent steps, sequential agents for dependent ones.

For smart commits with preflight checks:

```
/ac:commit
```

Runs linter and tests first, detects your project's commit conventions, and creates well-structured atomic commits. Delegates to `git-master:git-master` skill when available for style detection and intelligent splitting.

For refining ideas, creating PRDs, and managing product requests before planning:

```
/ac:ideate <describe your idea or request>
```

Unified idea refinement — Socratic interview with mathematical ambiguity scoring, adversarial challenge, and Jira-ready task generation. Supports `--bulk` for meeting notes triage and `--loop` for autonomous plan→execute. Produces a mature concept document with gaps, risks, and alternatives — ready for `/ac:plan` handoff.

### Updating

After plugin updates, sync your global config with new plugin features:

```
/ac:setup-global-claude-md update
```

This updates workflow routing and skill references while preserving your personal preferences (identity, stack, rules). Project-level files can be synced the same way:

```
/ac:init-claude-md update
/ac:init-rules update
```

## Agent Model Customization

By default, explore agents use **Haiku** (fast, cheap search) and librarian agents use **Sonnet** (quality external doc research).

Override agent models using Claude Code's native environment variables:

```bash
# In your shell profile or ~/.claude/settings.json env block
ANTHROPIC_DEFAULT_HAIKU_MODEL=claude-sonnet-4-6    # Upgrades all Haiku agents (explore, linter)
ANTHROPIC_DEFAULT_SONNET_MODEL=claude-opus-4-6     # Upgrades all Sonnet agents (librarian, feasibility, etc.)
```

Or in `~/.claude/settings.json`:

```json
{
  "env": {
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "claude-sonnet-4-6"
  }
}
```

| Agent | Default Model | Override Via |
|-------|--------------|-------------|
| explore, linter | Haiku | `ANTHROPIC_DEFAULT_HAIKU_MODEL` |
| librarian, feasibility, code-reviewer | Sonnet | `ANTHROPIC_DEFAULT_SONNET_MODEL` |
| challenger, plan-analysis, plan-review, verifier | Opus | `ANTHROPIC_DEFAULT_OPUS_MODEL` |

## Commands

### Workflow

| Command | Description |
|---------|-------------|
| `/ac:plan` | Classify intent, research via agents, interview, produce actionable plan |
| `/ac:execute` | Execute an approved plan — parallel background agents or sequential |
| `/ac:commit` | Smart commit — preflight checks (lint, tests), convention detection, atomic commits |
| `/ac:ideate` | Unified idea refinement — Socratic interview with mathematical ambiguity scoring, adversarial challenge, and Jira-ready task generation. Supports `--bulk` for meeting notes triage and `--loop` for autonomous plan→execute |

### Project Setup

| Command | Description |
|---------|-------------|
| `/ac:init-claude-md` | Auto-discover codebase, interview developer, generate project `CLAUDE.md` |
| `/ac:init-rules` | Analyze project conventions, score directories, generate `.claude/rules/` |

### Personal Setup

| Command | Description |
|---------|-------------|
| `/ac:setup-coding` | Scan your projects, interview on preferences, generate `~/.claude/skills/my-coding/` |
| `/ac:setup-language` | Scan your writing, interview on voice, generate `~/.claude/skills/my-language/` |
| `/ac:setup-global-claude-md` | Detect plugin skills + global MCP, interview, generate `~/.claude/CLAUDE.md` |

## Agents

All agents are **read-only** — advisory roles never have write tools. All agents enforce `disallowedTools: Write, Edit` as defense-in-depth. Commands invoke agents via the Agent tool with explicit `subagent_type` values (`"ac:explore"`, `"ac:librarian"`, etc.) to avoid routing to builtin agents.

| Agent | `subagent_type` | Model | Effort | Role |
|-------|----------------|-------|--------|------|
| `ac:explore` | `"ac:explore"` | Haiku | low | Codebase search — files, patterns, relationships. Parallel Glob + Grep + Read |
| `ac:librarian` | `"ac:librarian"` | Sonnet | medium | External docs — context7 MCP first, WebSearch fallback. Source-cited answers |
| `ac:linter` | `"ac:linter"` | Haiku | low | LSP code intelligence verifier — interprets `<new-diagnostics>`, runs navigation checks, returns CLEAN/BLOCKED/UNAVAILABLE verdict |
| `ac:plan-analysis` | `"ac:plan-analysis"` | Opus | high | Plan quality gate — dual-mode: pre-generation (Metis: hidden intentions, scope gaps, AI-slop risks) and post-generation (gap classification, tier sanity, acceptance criteria audit) |
| `ac:plan-review` | `"ac:plan-review"` | Opus | high | Adversarial plan reviewer — Momus-class, bias toward REJECT, tier challenge, Gemini second eye, OKAY/REJECT verdict |
| `ac:verifier` | `"ac:verifier"` | Opus | high | Post-execution compliance auditor — verifies done-when criteria, must-not-have exclusions, scope fidelity, APPROVE/REJECT verdict |
| `ac:challenger` | `"ac:challenger"` | Opus | high | Devil's advocate — gaps, risks, blind spots, alternative approaches |
| `ac:feasibility` | `"ac:feasibility"` | Sonnet | medium | Pragmatic evaluator — codebase fit, effort, prerequisites, dependencies |
| `ac:code-reviewer` | `"ac:code-reviewer"` | Sonnet | medium | 2-stage review — spec compliance against plan acceptance criteria, then code quality (APPROVED/BLOCKED verdict) |
| `ac:gemini-vision` | `"ac:gemini-vision"` | Sonnet | medium | File-based multimodal analysis — video, multi-image, large visual contexts via Gemini. Pasted images analyzed inline |
| `ac:investigate` | `"ac:investigate"` | Opus | high | Root cause investigator — hypothesis-driven debugging with structured evidence |

## Skills

| Skill | Description |
|-------|-------------|
| `ac-skill-creator` | Create skills, agents, commands, rules optimized for Claude Code. Includes prompt pattern library and style templates in `references/` |

## How It Works

### Planning (`/ac:plan`)

```
Request -> Classify (intent + complexity) -> Select Pipeline Profile
        -> Research (profile-conditional):
           Simple: direct Read (0 agents)
           Standard: 1 ac:explore agent
           Complex: 2-3 ac:explore + ac:librarian agents
        -> Pre-generation analysis (Complex only: plan-analysis Metis mode)
        -> Interview (AskUserQuestion with options)
        -> Draft plan: steps with Tier, done-when, QA scenarios, independence
        -> Wave decomposition + Analysis gate (plan-analysis post-generation)
        -> Save to .ac/plans/
        -> Profile-conditional handoff:
           Simple: auto-execute (no AskUserQuestion)
           Standard: Execute recommended, opt-in Deep Review
           Complex: Deep Review recommended
        -> Execute -> /ac:execute
```

### Execution (`/ac:execute`)

```
Load plan -> Parse Waves + extract complexity
          -> Wave 1: parallel background agents
             quick→Haiku (lean template), mid→Sonnet (Atlas template), senior→Opus (Atlas template)
          -> Wave 2+: sequential after prior wave completes
          -> After each unit: extract wisdom, diagnostics, ac:linter
          ->   Anti-duplication: wisdom injected into next workers ("prefer this context")
          ->   On agent failure: tier escalation (quick→Sonnet, mid→Opus, max 1 retry)
          -> Wisdom persisted to .ac/plans/{name}.wisdom.md
          -> Verification Wave (complexity-driven):
          ->   Simple: build+test only (skip agents)
          ->   Standard: code-reviewer + linter (skip Opus verifier)
          ->   Complex: full wave (code-reviewer + verifier + linter)
          ->   Build+test and agents launch concurrently
          ->   ALL pass → /ac:commit --skip-preflight (auto commit+push)
          ->   ANY fail → present failures → Fix+Re-verify / Accept+Commit
```

### Smart Commit (`/ac:commit`)

```
Request -> Context (git state + convention detection)
        -> Preflight (lint + tests must pass)
        -> Strategy (delegate to git-master or built-in atomic logic)
        -> Review (present commit plan, user approves)
        -> Execute (create commits, optional push)
```

### Ideate (`/ac:ideate`)

```
Idea/Request -> Classify (mode: idea refinement vs PRD vs PM task, detect --bulk/--loop)
             -> Research (parallel ac:explore + ac:librarian agents)
             -> Interview (Socratic questioning with ambiguity scoring, 3-7 rounds)
             -> Challenge (parallel ac:challenger + ac:feasibility agents)
             -> Generate (mature concept doc, PRD, or Jira-ready task files)
             -> Handoff (plan this / plan all / save & exit)
```

## Design Principles

**Reliability-first model routing** — Every plan step carries a tier (`quick`/`mid`/`senior`). `/ac:execute` routes each worker agent to the right model — Haiku for quick mechanical tasks, Sonnet for standard implementation, Opus for senior-level cross-layer changes. Failed agents escalate one tier before logging failure (quick→Sonnet, mid→Opus). The default is correctness, not cost savings.

**Complexity-driven verification** — Verification depth scales with plan complexity. Simple plans (1-2 steps) run build+test only. Standard plans add code-reviewer + linter agents. Complex plans get the full 3-agent wave (code-reviewer + verifier + linter). Build+test and verification agents launch concurrently to save time. Commit preflight is skipped via `--skip-preflight` when invoked by execute post-verification. Per-unit linter calls are advisory (early feedback), with the Phase 5 linter agent as the authoritative check.

**Pipeline Profiles** — Complexity classification (Simple/Standard/Complex) extends from verification into the entire pipeline. A Lean profile (Simple) spawns ~2-3 agents total — direct Read instead of explore agents, skips pre-gen analysis, auto-executes without AskUserQuestion. Standard gets ~4-6 agents with 1 explore and opt-in Deep Review. Full profile (Complex) gets ~7-10 agents with multi-agent research, Metis pre-gen analysis, and recommended Deep Review. Agent spawn count drops 40-60% for typical workflows.

**Pre-generation analysis** — For Complex plans, `plan-analysis` runs in Metis mode to surface hidden intentions, scope gaps, and AI-slop risks from the raw request. This front-loads quality — preventing weak plans from reaching the interview stage with unchallenged assumptions.

```
Daily work (Sonnet) -> Task detected -> Classify complexity → Select Pipeline Profile
  -> Build/Refactor? -> /ac:plan
       -> Research (profile-conditional: 0 / 1 / 2-3 agents)
       -> Pre-generation analysis (Complex only: Metis mode)
       -> Interview -> Draft (QA scenarios, tier assignments)
       -> Handoff (Simple: auto-execute | Standard: opt-in review | Complex: recommended review)
  -> /ac:execute -> Workers: quick→Haiku (lean), mid→Sonnet (Atlas), senior→Opus (Atlas)
                 -> Anti-duplication wisdom propagation between waves
                 -> Verification Wave (complexity-driven):
                    Simple: build+test | Standard: +code-reviewer+linter | Complex: +verifier
                 -> ALL pass → /ac:commit --skip-preflight / Done
  -> Back to daily work (Sonnet)
```

**Built on official patterns** — Every component follows Claude Code's native extension points: agents, skills, commands, rules, MCP. Patterns extracted from Anthropic's official plugins and system prompt archives. No custom runtime, no compilation — pure markdown with YAML frontmatter.

**Progressive disclosure** — Plugin metadata is always in context (~100 words per component). SKILL.md body loads on trigger. Reference files load on demand. Tokens are injected only when relevant.

**Read-only advisory** — Agents that advise (explore, librarian, plan-analysis, plan-review, verifier) never have write tools. All 11 agents enforce `disallowedTools: Write, Edit` as defense-in-depth on top of explicit tool allowlists. Only execution agents spawned by `/ac:execute` get full tool access.

**Subagent-only architecture** — All agents use the subagent execution model (fresh context, custom model/tools). The fork model (inherits parent context + prompt cache) is cheaper but requires `model: inherit` (breaks model routing) and `tools: ['*']` (breaks read-only advisory).

**Plan-first** — All commands follow the same pattern: classify, research, interview, generate, review, install. No code is written during planning.

## Plugin Structure

```
plugins/ac/
├── .claude-plugin/
│   └── plugin.json              # Plugin metadata (name: "ac")
├── .mcp.json                    # MCP server config (empty — MCP servers are user-installed)
├── commands/                    # 11 user-invocable /ac:* commands
│   ├── plan.md                  # /ac:plan
│   ├── execute.md               # /ac:execute
│   ├── ideate.md                # /ac:ideate
│   ├── init-claude-md.md        # /ac:init-claude-md
│   ├── init-rules.md            # /ac:init-rules
│   ├── setup-coding.md          # /ac:setup-coding
│   ├── setup-language.md        # /ac:setup-language
│   ├── setup-global-claude-md.md # /ac:setup-global-claude-md
│   └── commit.md               # /ac:commit
├── agents/                      # 11 read-only agent definitions
│   ├── explore.md               # Haiku codebase search
│   ├── librarian.md             # Sonnet external docs
│   ├── linter.md                # Haiku LSP code intelligence verifier
│   ├── plan-analysis.md         # Opus plan quality gate (tier sanity, gap, slop)
│   ├── plan-review.md           # Opus adversarial plan reviewer (Momus-class)
│   ├── verifier.md              # Opus post-execution compliance auditor
│   ├── challenger.md            # Opus devil's advocate
│   ├── feasibility.md           # Sonnet feasibility evaluator
│   ├── code-reviewer.md         # Sonnet spec + quality reviewer
│   ├── gemini-vision.md         # Sonnet multimodal via Gemini
│   └── investigate.md           # Opus root cause investigator
├── skills/
│   └── ac-skill-creator/        # Component creation skill
│       ├── SKILL.md
│       └── references/
│           ├── prompt-patterns.md
│           ├── coding-style-template.md
│           ├── language-style-template.md
│           ├── project-claude-md-template.md
│           ├── global-claude-md-template.md
│           └── pm-base.md
├── CLAUDE.md
├── README.md
└── LICENSE
```

All components are pure markdown with YAML frontmatter. No compiled code, no runtime dependencies.

## Optional MCP Integrations

ac agents can leverage external MCP servers for enhanced capabilities. These are **not bundled** — install them separately for optional features.

### context7 — Live Documentation

Version-aware library and framework documentation lookup. When installed, the **librarian** agent queries context7 first for official docs before falling back to WebSearch — faster and more accurate than web scraping.

```bash
claude mcp add context7 -- npx -y @upstash/context7-mcp
```

### gemini-cli — Gemini CLI Bridge

Bridges Claude Code to Google Gemini's unique capabilities. Three tools:

- **ask-gemini** — Multimodal analysis (screenshots, design mockups, video) and large context analysis (1M tokens vs Claude's 200k). Used by **gemini-vision** for visual analysis, **librarian** for large codebase research.
- **brainstorm** — Structured ideation with 6 methodologies (SCAMPER, design thinking, lateral thinking, etc.)
- **fetch-chunk** — Chunked retrieval for large Gemini responses

Used by **gemini-vision**, **plan-analysis** (second-eye gap analysis), and **librarian** (large context delegation) agents.

```bash
npm install -g gemini-mcp-tool
claude mcp add gemini-cli -- gemini-mcp-tool
```

### skillsmp-mcp-server — Skill Marketplace

Search, discover, and install AI coding skills from the [SkillsMP marketplace](https://skillsmp.com). Five tools:

- **skillsmp_search** — Keyword search across the marketplace
- **skillsmp_ai_search** — Semantic search with natural language queries
- **skillsmp_get_skill_content** — Preview a skill's SKILL.md before installing
- **skillsmp_list_repo_skills** — List all skills in a GitHub repository
- **skillsmp_install_skill** — Install skills to your agent (Claude Code, Codex, Cursor, etc.)

```bash
npm install -g skillsmp-mcp-server
claude mcp add skillsmp-mcp-server -- skillsmp-mcp-server
```

> Requires a `SKILLSMP_API_KEY` — get one at [skillsmp.com](https://skillsmp.com).

### How conditional routing works

When these MCP servers are installed, agents automatically detect and use them. When not installed, agents gracefully fall back to standard tools (WebSearch, local analysis). No configuration needed — just install and agents adapt.

## Background Agents (Troubleshooting)

If background agents don't produce visible progress, check your global Claude Code settings.

### Required global settings

Add these keys in `~/.claude/settings.json` under `env`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1",
    "CLAUDE_CODE_ENABLE_TASKS": "true"
  }
}
```

### Reliability preflight

`/ac:execute` performs a preflight before launching parallel agents:

- Validates required environment keys
- Checks permission/hook interference risk
- Falls back to sequential foreground execution on failures

## License

MIT
