# ac

**A structured development partner for Claude Code.**

`ac` learns how you code, how you write, and how you think about architecture — then applies that knowledge to every task. It plans before coding, researches before asking, delegates to specialized agents, and never forgets your conventions.

Designed for **Sonnet as your daily driver** — but optimized for **any model**. When complexity spikes, Opus agents step in for planning, deep investigation, and architecture. Search and documentation agents are customizable per user. **Structured workflows that scale with your model choice.**

## Why This Plugin

Claude Code is powerful out of the box, but without structure it burns tokens on false starts, scope creep, and redundant exploration. `ac` fixes that:

- **It knows your style** — Analyzes your existing projects and writing to create personal `my-coding` and `my-language` skills that load automatically
- **It plans before it codes** — Every non-trivial task goes through classify, research, interview, plan. No wasted cycles on wrong approaches
- **It delegates intelligently** — Haiku agents search your codebase and fetch docs in parallel. Sonnet and Opus agents review plans through quality gates
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

For complex bugs or deep investigation:

```
/ac:deep <describe the bug or issue>
```

Opus investigates the codebase, traces root cause through hypothesis-first analysis, and returns specific fix steps.

For smart commits with preflight checks:

```
/ac:commit
```

Runs linter and tests first, detects your project's commit conventions, and creates well-structured atomic commits. Delegates to `git-master:git-master` skill when available for style detection and intelligent splitting.

For brainstorming and evaluating ideas before planning:

```
/ac:brainstorm <describe your idea>
```

Socratic interview refines your idea through targeted questions, then parallel challenger and feasibility agents stress-test it. Produces a mature concept document with gaps, risks, and alternatives — ready for `/ac:plan` handoff. Large ideas auto-decompose into phases.

For critical tasks where partial delivery is unacceptable:

```
/ac:ultra <describe your task>
```

Chains the full workflow — certainty gate, planning, execution, and verification — in one command. Enforces delegation-first orchestration and requires evidence-based completion before declaring done.

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
ANTHROPIC_DEFAULT_SONNET_MODEL=claude-opus-4-6     # Upgrades all Sonnet agents (librarian, challenger, etc.)
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
| librarian, plan-analysis, challenger, feasibility, code-reviewer | Sonnet | `ANTHROPIC_DEFAULT_SONNET_MODEL` |
| plan-review | Opus | `ANTHROPIC_DEFAULT_OPUS_MODEL` |

## Commands

### Workflow

| Command | Description | Model |
|---------|-------------|-------|
| `/ac:plan` | Classify intent, research via agents, interview, produce actionable plan | Opus |
| `/ac:deep` | Opus-powered root cause analysis — hypothesis-first debugging and investigation | Opus |
| `/ac:execute` | Execute an approved plan — parallel background agents or sequential | Sonnet |
| `/ac:ultra` | End-to-end disciplined execution — certainty, plan, execute, verify in one command | Opus |
| `/ac:commit` | Smart commit — preflight checks (lint, tests), convention detection, atomic commits | Sonnet |
| `/ac:brainstorm` | Socratic idea refinement — interview, challenge, and mature ideas before planning | Opus |

### Project Setup

| Command | Description | Model |
|---------|-------------|-------|
| `/ac:init-claude-md` | Auto-discover codebase, interview developer, generate project `CLAUDE.md` | Opus |
| `/ac:init-rules` | Analyze project conventions, score directories, generate `.claude/rules/` | Opus |

### Personal Setup

| Command | Description | Model |
|---------|-------------|-------|
| `/ac:setup-coding` | Scan your projects, interview on preferences, generate `~/.claude/skills/my-coding/` | Opus |
| `/ac:setup-language` | Scan your writing, interview on voice, generate `~/.claude/skills/my-language/` | Opus |
| `/ac:setup-global-claude-md` | Detect plugin skills + global MCP, interview, generate `~/.claude/CLAUDE.md` | Opus |

## Agents

All agents are **read-only** — advisory roles never have write tools. Commands invoke agents via the Agent tool with explicit `subagent_type` values (`"ac:explore"`, `"ac:librarian"`, etc.) to avoid routing to builtin agents.

| Agent | `subagent_type` | Model | Role |
|-------|----------------|-------|------|
| `ac:explore` | `"ac:explore"` | Haiku | Codebase search — files, patterns, relationships. Parallel Glob + Grep + Read |
| `ac:librarian` | `"ac:librarian"` | Sonnet | External docs — context7 MCP first, WebSearch fallback. Source-cited answers |
| `ac:linter` | `"ac:linter"` | Haiku | LSP code intelligence verifier — interprets `<new-diagnostics>`, runs navigation checks, returns CLEAN/BLOCKED/UNAVAILABLE verdict |
| `ac:plan-analysis` | `"ac:plan-analysis"` | Sonnet | Plan quality gate — gap classification, AI-slop detection, acceptance criteria audit |
| `ac:plan-review` | `"ac:plan-review"` | Opus | Plan executability gate — reference verification, OKAY/REJECT verdict |
| `ac:challenger` | `"ac:challenger"` | Sonnet | Devil's advocate — gaps, risks, blind spots, alternative approaches |
| `ac:feasibility` | `"ac:feasibility"` | Sonnet | Pragmatic evaluator — codebase fit, effort, prerequisites, dependencies |
| `ac:code-reviewer` | `"ac:code-reviewer"` | Sonnet | 2-stage review — spec compliance against plan acceptance criteria, then code quality (APPROVED/BLOCKED verdict) |
| `ac:gemini-vision` | `"ac:gemini-vision"` | Sonnet | Multimodal analysis — screenshots, video, design mockups via Gemini |

## Skills

| Skill | Model | Description |
|-------|-------|-------------|
| `ac-skill-creator` | Opus | Create skills, agents, commands, rules optimized for Claude Code. Includes prompt pattern library and style templates in `references/` |

## How It Works

### Planning (`/ac:plan`)

```
Request -> Classify (intent + complexity)
        -> Research (parallel ac:explore + ac:librarian agents)
        -> Interview (AskUserQuestion with options)
        -> Draft plan with acceptance criteria
        -> Analysis gate (plan-analysis agent)
        -> Save to ~/.claude/projects/<hash>/plans/
        -> User approves -> /ac:execute
```

### Deep Investigation (`/ac:deep`)

```
Request -> Classify (intent type + scope + predict likely issues)
        -> Research (LSP navigation first: incomingCalls/goToDefinition/findReferences,
                     then parallel ac:explore + ac:librarian agents)
        -> Analyze (hypothesis-first, verify against code, load my-coding)
        -> Report (diagnosis + evidence + recommended fix + verification)
        -> Main agent executes recommended steps
```

### Execution (`/ac:execute`)

```
Load plan -> Decompose into Work Units
          -> Independent units -> parallel background agents
          -> Dependent units -> sequential agents
          -> After each unit: check <new-diagnostics>, delegate to ac:linter
          -> Track progress per wave
          -> Final verification (build + test + lint + LSP navigation check)
```

### Smart Commit (`/ac:commit`)

```
Request -> Context (git state + convention detection)
        -> Preflight (lint + tests must pass)
        -> Strategy (delegate to git-master or built-in atomic logic)
        -> Review (present commit plan, user approves)
        -> Execute (create commits, optional push)
```

### Brainstorm (`/ac:brainstorm`)

```
Idea -> Understand (classify + parallel ac:explore + ac:librarian research)
     -> Interview (Socratic questioning, 3-7 rounds, clarity tracking)
     -> Challenge (parallel ac:challenger + ac:feasibility agents)
     -> Crystallize (mature document + multi-phase decomposition if large)
     -> User choice: /ac:plan handoff or iterate more
```

### Ultra Mode (`/ac:ultra`)

```
Request -> Classify (intent + complexity)
        -> Certainty gate (parallel agents, readiness self-check)
        -> Plan (invoke ac:plan or ac:deep)
        -> Execute (invoke ac:execute or direct)
        -> Verify (build + test + lint + manual QA)
        -> Complete (all TODOs done, evidence collected)
```

## Design Principles

**Sonnet-first, Opus-when-needed** — The plugin is designed for developers who run Claude Code on Sonnet as their default model. Complex tasks escalate to Opus agents for planning, investigation, and architecture, then return to Sonnet for execution. Haiku handles fast search and exploration. You get the right model at each step without switching manually.

```
Daily work (Sonnet) -> Complex task detected
  -> Build/Refactor? -> /ac:plan (Opus plans, Haiku researches)
  -> Debug/Investigate? -> /ac:deep (Opus investigates, Haiku searches)
  -> Critical task? -> /ac:ultra (Opus orchestrates end-to-end with verification)
  -> /ac:execute (Sonnet agents implement)
  -> Back to daily work (Sonnet)
```

**Built on official patterns** — Every component follows Claude Code's native extension points: agents, skills, commands, rules, MCP. Patterns extracted from Anthropic's official plugins and system prompt archives. No custom runtime, no compilation — pure markdown with YAML frontmatter.

**Progressive disclosure** — Plugin metadata is always in context (~100 words per component). SKILL.md body loads on trigger. Reference files load on demand. Tokens are injected only when relevant.

**Read-only advisory** — Agents that advise (explore, librarian, plan-analysis, plan-review) never have write tools. Only execution agents spawned by `/ac:execute` get full tool access.

**Plan-first** — All commands follow the same pattern: classify, research, interview, generate, review, install. No code is written during planning.

## Plugin Structure

```
plugins/ac/
├── .claude-plugin/
│   └── plugin.json              # Plugin metadata (name: "ac")
├── .mcp.json                    # MCP server config (empty — MCP servers are user-installed)
├── commands/                    # 11 user-invocable /ac:* commands
│   ├── plan.md                  # /ac:plan
│   ├── deep.md                  # /ac:deep
│   ├── execute.md               # /ac:execute
│   ├── ultra.md                 # /ac:ultra
│   ├── init-claude-md.md        # /ac:init-claude-md
│   ├── init-rules.md            # /ac:init-rules
│   ├── setup-coding.md          # /ac:setup-coding
│   ├── setup-language.md        # /ac:setup-language
│   ├── setup-global-claude-md.md # /ac:setup-global-claude-md
│   ├── commit.md               # /ac:commit
│   └── brainstorm.md           # /ac:brainstorm
├── agents/                      # 9 read-only agent definitions
│   ├── explore.md               # Haiku codebase search
│   ├── librarian.md             # Sonnet external docs
│   ├── linter.md                # Haiku LSP code intelligence verifier
│   ├── plan-analysis.md         # Sonnet plan auditor
│   ├── plan-review.md           # Opus plan reviewer
│   ├── challenger.md            # Sonnet devil's advocate
│   ├── feasibility.md           # Sonnet feasibility evaluator
│   ├── code-reviewer.md         # Sonnet spec + quality reviewer
│   └── gemini-vision.md         # Sonnet multimodal via Gemini
├── skills/
│   └── ac-skill-creator/        # Component creation skill
│       ├── SKILL.md
│       └── references/
│           ├── prompt-patterns.md
│           ├── coding-style-template.md
│           ├── language-style-template.md
│           ├── project-claude-md-template.md
│           └── global-claude-md-template.md
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

### gemini-mcp-tool — Gemini CLI Bridge

Bridges Claude Code to Google Gemini's unique capabilities. Three tools:

- **ask-gemini** — Multimodal analysis (screenshots, design mockups, video) and large context analysis (1M tokens vs Claude's 200k). Used by **gemini-vision** for visual analysis, **librarian** for large codebase research.
- **brainstorm** — Structured ideation with 6 methodologies (SCAMPER, design thinking, lateral thinking, etc.)
- **fetch-chunk** — Chunked retrieval for large Gemini responses

Used by **gemini-vision**, **plan-analysis** (second-eye gap analysis), and **librarian** (large context delegation) agents.

```bash
npm install -g gemini-mcp-tool
claude mcp add gemini-mcp-tool -- gemini-mcp-tool
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
