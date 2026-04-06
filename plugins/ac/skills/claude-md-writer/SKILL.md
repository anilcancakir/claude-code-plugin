---
name: claude-md-writer
description: "Write CC-optimal CLAUDE.md and CLAUDE.local.md files. Use when creating, reviewing, or improving any CLAUDE.md — global, project-level, or local. Covers section authoring, compression, dedup boundaries, and quality scoring."
when_to_use: "TRIGGER when: 'write CLAUDE.md', 'improve CLAUDE.md', 'review CLAUDE.md', 'create project instructions', working with any CLAUDE.md or CLAUDE.local.md file. DO NOT TRIGGER: writing skills, agents, commands, or rules (use respective creator skills)."
model: sonnet
effort: medium
---

# CLAUDE.md Writer

Write CLAUDE.md files that Claude Code actually follows. Every line must earn its place — CLAUDE.md loads every conversation turn, consuming context window tokens each time.

## How CC Loads CLAUDE.md

CLAUDE.md is delivered as a **user message after the system prompt** — advisory context, not enforced configuration. Adherence degrades with file length and conflicting rules.

**Loading order** (lowest → highest priority):
1. Managed policy (`/Library/Application Support/ClaudeCode/CLAUDE.md`) — org-wide, cannot exclude
2. User global (`~/.claude/CLAUDE.md` + `~/.claude/rules/`)
3. Project walkup — from working dir upward: `./CLAUDE.md` + `./.claude/CLAUDE.md` + `./.claude/rules/` at each level
4. Local (`./CLAUDE.local.md`) — personal, not git-tracked
5. Additional dirs (via `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD` env var)

Subdirectory CLAUDE.md files lazy-load when Claude touches files in that directory.

**Compaction**: CLAUDE.md survives `/compact` — re-read from disk and re-injected. Conversation-only instructions are lost.

**Import syntax**: `@path/to/file` pulls in additional files. Max 5 hops. Relative paths resolve from the importing file.

## Size Limits

| File | Target | Hard limit |
|------|--------|------------|
| Global `~/.claude/CLAUDE.md` | ≤120 lines | 40K chars (CC warning) |
| Project `./CLAUDE.md` | ≤120 lines (~2500 tokens) | 40K chars (CC warning) |
| `CLAUDE.local.md` | ≤50 lines | Same |
| `MEMORY.md` | ≤200 lines or 25KB | Hard truncation |

Shorter files = better adherence. Over 200 lines, instruction-following drops measurably.

## Core Principles

- **Compression-first**: Every token costs every turn. One-liner per concept when possible
- **Non-obvious only**: If Claude can infer it from reading code, don't state it
- **Actionable**: Commands copy-paste-ready, paths real, steps concrete
- **Project-specific**: Generic advice ("write tests", "use meaningful names") is noise
- **Dedup-aware**: Don't repeat what CC system prompt or higher-level CLAUDE.md already provides

## File Type Guide

### Global CLAUDE.md (`~/.claude/CLAUDE.md`)

Personal development partner configuration. Loaded in every CC session across all projects.

**Sections** (in order):
1. **Identity** — Communication style, expertise assumption, language rule (3-4 lines)
2. **Tech Stack** — Backend, mobile, frontend, infra, environment. Remove unused lines
3. **Workflow** — Intent routing, delegation, research, execution, verification patterns
4. **Skills** — Table of detected skills with trigger descriptions
5. **MCP** — Enabled servers with one-line capabilities
6. **LSP** — Conditional on detected plugins
7. **Rules** — 3-5 imperatives. Defer detailed rules to `my-coding` skill

**Compression-critical**: Workflow section (Intent Gate table + Research delegation) must survive verbatim — these are routing anchors that CC uses to decide how to act.

### Project CLAUDE.md (`./CLAUDE.md`)

Project-specific context. Loaded in every conversation within this project directory.

**Sections** (in order — include only if content discovered):
1. **Header** — Project name + one-line mission
2. **Commands** — Copy-paste-ready table (build, test, lint, dev)
3. **Architecture** — Annotated tree, depth 2, non-obvious purpose only
4. **Key Files** — Entry points, critical configs Claude wouldn't find easily
5. **Code Style** — Imperative conventions from project source (NOT generic)
6. **Testing** — Test commands + patterns
7. **Gotchas** — Non-obvious quirks, anti-patterns from source comments
8. **Skills & Extensions** — Approved references only

**Dedup boundary**: NEVER duplicate global CLAUDE.md content (workflow, identity, tech stack, coding rules). Project = project-specific facts only.

### CLAUDE.local.md

Personal project-specific preferences — gitignored. Appended after CLAUDE.md at same directory level (wins on conflict).

**Use for**: Local URLs, sandbox endpoints, preferred test data, personal workflow shortcuts. Keep under 50 lines.

### .claude/rules/ Files

Path-scoped conventions that inject when matching files are touched.

- **Unconditional** (no frontmatter): loaded at launch alongside CLAUDE.md
- **Path-scoped** (with `paths` frontmatter): inject only when matching files are opened
- Use for detailed coding conventions that only matter for specific file patterns

**Boundary**: Generic project conventions → CLAUDE.md. File-path-specific conventions → rules.

## Section Authoring Patterns

### Commands Section

```markdown
## Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Production build with optimization |
| `npm test -- --watch` | Run tests in watch mode |
```

- Copy-paste-ready — exact command, not descriptions of commands
- Skip obvious (`npm install`, `git clone`)
- Include flags that matter (`--watch`, `--coverage`, `--runInBand`)

### Architecture Section

```markdown
## Architecture

```
src/
  api/        # REST endpoints — one file per resource
  services/   # Business logic layer — no HTTP concerns
  models/     # Sequelize models with custom scopes
  jobs/       # Background job processors (Bull queues)
```
```

- Depth 2 max — Claude can explore deeper with Glob
- Annotate only directories whose purpose isn't obvious from name
- Skip `node_modules/`, `dist/`, `.git/`, config dirs with clear names

### Code Style Section

Good — project-specific, imperative, verifiable:
```markdown
- Use barrel exports (`index.ts`) in every module directory
- Prefer `readonly` arrays — use `ReadonlyArray<T>` not `T[]` for function params
- Error responses use `AppError` class from `src/errors.ts` — never raw Error
```

Bad — generic, vague, unverifiable:
```markdown
- Follow clean code principles
- Use descriptive variable names
- Handle errors properly
```

### Gotchas Section

Good — non-obvious, prevents debugging:
```markdown
- Migrations auto-run at boot — never modify existing migration files, create new ones
- `NEXT_PUBLIC_*` vars must be set at BUILD time, not runtime
- Tests must run sequentially (`--runInBand`) due to shared DB state
```

Bad — obvious, generic:
```markdown
- Be careful with database migrations
- Environment variables must be configured
- Tests should be independent
```

### Key Files Section

Good — entry points Claude wouldn't find:
```markdown
- `src/bootstrap.ts` — Server bootstrap, DI container setup. Import order matters
- `config/features.yml` — Feature flags. Changes require restart
```

Bad — discoverable or obvious:
```markdown
- `package.json` — Node.js configuration
- `src/index.ts` — Application entry point
```

## Emphasis for Adherence

Adding emphasis tokens improves instruction-following in longer files:

```markdown
IMPORTANT: Always use pnpm, not npm.
YOU MUST run tests before committing.
```

Use sparingly — if everything is IMPORTANT, nothing is. Reserve for rules where violation causes real damage.

## Quality Scoring

Score each criterion (from Anthropic's official rubric):

| Criterion | Weight | What earns full score |
|-----------|--------|-----------------------|
| Commands/Workflows | 20pts | All essential commands with context |
| Architecture Clarity | 20pts | Key dirs explained, entry points identified |
| Non-Obvious Patterns | 15pts | Gotchas, workarounds, "why we do it this way" |
| Conciseness | 15pts | Dense content, no filler, no obvious info |
| Currency | 15pts | Commands work, file refs accurate, stack current |
| Actionability | 15pts | Copy-paste ready, concrete steps, real paths |

**Red flags**: Commands that would fail, references to deleted files, outdated tech versions, generic advice, unfinished TODOs, duplicate info across files.

## Quality Checklist

Before finalizing any CLAUDE.md:

- Every line answers: "Would removing this cause Claude to make mistakes?"
- No content already in higher-level CLAUDE.md (project files)
- No obvious instructions or generic best practices
- No file listings discoverable via Glob or LS
- No setup/installation steps (use README for that)
- No verbose multi-line explanations (one-liner per concept)
- Architecture uses annotated tree, non-obvious only
- Code Style conventions are imperative and verifiable
- Gotchas are non-obvious quirks from actual codebase
- Commands are copy-paste-ready with real flags
- Token budget verified (global ≤120 lines, project ≤2500 tokens)
- No conflicting rules across files (Claude picks arbitrarily on conflict)

## References

| Topic | File | When to read |
|-------|------|-------------|
| Section patterns | [claude-md-patterns.md](references/claude-md-patterns.md) | Before writing — complete section templates, good/bad examples, monorepo patterns |
| CLAUDE.md dedup | [claude-md-dedup-guide.md](references/claude-md-dedup-guide.md) | Before writing — dedup boundaries between global/project/rules/my-coding/CC system prompt |
| CC dedup (general) | `${CLAUDE_SKILL_DIR}/../prompt-writer/references/cc-dedup-guide.md` | When checking what CC system prompt already provides |
