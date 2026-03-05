# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Mission

The `ac` plugin turns Claude Code into a structured development partner. It provides plan-first workflows, specialized agents with model routing, and a skill creator — so any developer installs the plugin and immediately gets reduced wasted LLM cycles through structured orchestration.

## Architecture

```
claude-code-plugin/
├── .claude-plugin/plugin.json   # Plugin metadata (name: "ac")
├── .mcp.json                    # MCP server configs (context7)
├── commands/                    # 8 user-invocable /ac:* commands
├── agents/                      # 4 read-only agent definitions
├── skills/ac-skill-creator/     # Skill + references/ for component creation
├── package.json                 # npm distribution
└── README.md
```

All components are pure markdown with YAML frontmatter. No compiled code.

## Commands

| Command | Description | Model |
|---------|-------------|-------|
| `/ac:plan` | Classify → research → interview → plan | Opus |
| `/ac:deep` | Opus-powered root cause analysis for complex bugs and debugging | Opus |
| `/ac:execute` | Execute approved plan (parallel worktree or sequential) | Sonnet |
| `/ac:init-claude-md` | Generate/enhance project CLAUDE.md | Opus |
| `/ac:init-rules` | Auto-generate `.claude/rules/` from project analysis | Opus |
| `/ac:setup-coding` | Analyze projects → interview → generate `my-coding` skill | — |
| `/ac:setup-language` | Analyze writing → interview → generate `my-language` skill | — |
| `/ac:setup-global-claude-md` | Interview → generate `~/.claude/CLAUDE.md` | — |

## Agents

| Agent | Model | Role | Tools |
|-------|-------|------|-------|
| `explore` | Haiku | Codebase search — files, patterns, relationships | Glob, Grep, Read, LS |
| `librarian` | Haiku | External docs — context7 MCP → WebSearch fallback | context7, WebSearch, WebFetch |
| `plan-analysis` | Sonnet | Plan gap/slop detection, acceptance criteria audit | Read, Grep, Glob |
| `plan-review` | Opus | Plan executability verification (OKAY/REJECT) | Read, Grep, Glob |

All agents are read-only. No write tools on advisory roles.

## Skills & MCP

- `ac-skill-creator` (Opus) — Create skills, agents, commands, rules for Claude Code. Has `references/` with templates for coding style, language style, CLAUDE.md, and prompt patterns
- MCP: `context7` — Live documentation API via `@upstash/context7-mcp`

## Design Principles

- **Model routing**: Haiku (search/fast), Sonnet (execution/analysis), Opus (planning/architecture/creation)
- **Progressive disclosure**: Metadata always loaded → SKILL.md body on trigger → references/ on demand
- **Read-only advisory**: Agents that advise never have write tools
- **Plan-first**: All commands follow classify → research → interview → generate → review → install

## Key Files

- `skills/ac-skill-creator/references/prompt-patterns.md` — Pattern library for writing Claude Code components
- `skills/ac-skill-creator/references/coding-style-template.md` — Template for `my-coding` skill generation
- `skills/ac-skill-creator/references/language-style-template.md` — Template for `my-language` skill generation
- `skills/ac-skill-creator/references/global-claude-md-template.md` — Template for global CLAUDE.md generation
- `skills/ac-skill-creator/references/project-claude-md-template.md` — Template for project CLAUDE.md generation

## Gotchas

- No test infrastructure — this is a pure markdown plugin, verify manually via `claude plugin add ./`
- Commands delegate to `ac-skill-creator` for file generation — they don't write files directly
