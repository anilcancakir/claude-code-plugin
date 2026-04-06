# CLAUDE.md Section Patterns

Complete templates and examples for each CLAUDE.md section type. Read before writing any CLAUDE.md content.

---

## Global CLAUDE.md Sections

### Identity (3-4 lines)

```markdown
Expert-peer partner. Deep architecture focus, skip basics. Code first, prose second.

- English only — all code, naming, comments, docblocks, commits.
- Flawed approach? Raise concern + alternative, then ask.
- Ambiguous? AskUserQuestion, don't guess.
```

**Pattern**: Style declaration (1 line) → behavioral rules (2-3 bullets). No filler. Communication style determines how CC frames all responses.

### Tech Stack (remove unused lines)

```markdown
## Stack

Backend: PHP 8.4 / Laravel · Mobile: Dart / Flutter · Infra: Docker, Go · Runtime: Node 22, Bun · Env: macOS arm64, zsh
```

**Pattern**: Single-line per category with `·` separators. Remove empty categories entirely. Single-stack developers keep 1-2 lines.

### Workflow (copy verbatim — compression-critical)

The Intent Gate table and Research delegation section must appear verbatim. These are routing anchors — CC uses them to decide how to handle each request.

**Compression-critical elements** (must survive verbatim):
- 6-type intent routing table (Research/Build/Refactor/Investigation/Fix/Evaluation)
- Delegation check (3-step: specialized agent → matching skill → super simple)
- Research delegation ("proactively" keyword + parallel agent pattern)
- Background barrier ("DO NOT proceed" + "single message block")
- Verification requirements (evidence required, lint clean, tests pass)

### Skills Table

```markdown
## Skills

| Skill | When |
|-------|------|
| `my-coding` | Any code: generate, review, refactor, implement |
| `github-cli:github-cli` | gh CLI, issues, PRs, releases, GitHub Actions |
```

**Pattern**: Name in backtick-code, trigger in plain text. One line per skill. Exclude creator/internal skills.

### Rules (3-5 imperatives)

```markdown
## Rules

- TDD — failing test first. Red-green-refactor. No exceptions.
- Strict types — every param, return, property typed.
- Minimal changes — only what's requested. No bonus refactors.
- Detailed coding rules → `my-coding` skill.
```

**Pattern**: Imperative statement + enforcement level. If `my-coding` skill exists, defer detailed rules there. Keep this section to 3-5 high-impact rules.

---

## Project CLAUDE.md Sections

### Header

```markdown
# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Mission

Brief project description — what it does, why it exists. One paragraph max.
```

**Pattern**: Standard header + mission. Mission helps CC understand the "why" behind code patterns.

### Commands Table

```markdown
## Commands

| Command | Description |
|---------|-------------|
| `npm run build:prod` | Production build with tree-shaking |
| `npm test -- --coverage` | Run tests with coverage report |
| `npm run lint:fix` | Auto-fix lint issues |
| `docker compose up -d` | Start all services (detached) |
```

**Rules**:
- Exact command, not description of command
- Include meaningful flags (`--coverage`, `--watch`, `-d`)
- Skip obvious (`npm install`, `git clone`, `cd <dir>`)
- Group by workflow stage if >6 commands

### Architecture Tree

```markdown
## Architecture

```
├── src/
│   ├── api/          # REST endpoints — one file per resource
│   ├── services/     # Business logic — no HTTP concerns
│   ├── models/       # Sequelize with custom scopes
│   └── jobs/         # Bull queue processors
├── config/           # Environment-specific YAML configs
└── scripts/          # One-off migration and seed scripts
```
```

**Rules**:
- Depth 2 max — Claude explores deeper with Glob
- Annotate only non-obvious directories
- Skip: `node_modules/`, `dist/`, `.git/`, vendor dirs, config dirs with clear names
- Use `#` comments inline, not separate description lines

### Key Files

```markdown
## Key Files

- `src/bootstrap.ts` — Server bootstrap, DI container. Import order matters
- `config/features.yml` — Feature flags (changes require restart)
- `.env.example` — Required environment variables with descriptions
```

**Rules**:
- Only files Claude wouldn't find easily via Glob
- Entry points, critical configs, non-obvious files
- One line per file: path + why it matters

### Code Style

```markdown
## Code Style

- Barrel exports (`index.ts`) in every module directory
- `readonly` arrays for function params — `ReadonlyArray<T>` not `T[]`
- Error responses use `AppError` from `src/errors.ts` — never raw Error
- Service methods return `Result<T, AppError>` — never throw
```

**Rules**:
- Imperative, verifiable statements from actual codebase
- NEVER generic ("clean code", "SOLID", "meaningful names")
- Each convention should be checkable: can I grep/review for compliance?

### Testing

```markdown
## Testing

- `npm test -- --runInBand` — Sequential (shared DB state)
- Factory functions in `tests/factories/` — never inline mocks
- Integration tests use real DB via `tests/setup.ts` — no mocking
- Snapshot tests for API response shapes only
```

**Rules**:
- Test commands with exact flags
- Testing patterns specific to this project
- Where test helpers/factories live

### Gotchas

```markdown
## Gotchas

- Migrations auto-run at boot — never modify existing ones, create new
- `NEXT_PUBLIC_*` vars set at BUILD time, not runtime
- Redis connection requires `?family=0` suffix for IPv6 on macOS
- `UserService.find()` returns soft-deleted records — use `.active()` scope
```

**Rules**:
- Non-obvious quirks that cause debugging sessions
- Anti-patterns found in source comments or learned the hard way
- Environment-specific gotchas
- NEVER obvious warnings ("be careful with migrations")

---

## Monorepo Patterns

### Root CLAUDE.md

```markdown
# CLAUDE.md

Monorepo with <N> packages. Shared tooling at root.

## Packages

| Package | Path | Description |
|---------|------|-------------|
| `@org/api` | `packages/api` | REST API server |
| `@org/web` | `packages/web` | Next.js frontend |
| `@org/shared` | `packages/shared` | Shared types and utils |

## Commands

| Command | Scope | Description |
|---------|-------|-------------|
| `pnpm -r build` | All | Build all packages |
| `pnpm --filter @org/api test` | API | Run API tests |

## Cross-Package Patterns

- Shared types in `@org/shared` — import from there, never duplicate
- API client generated from OpenAPI spec — run `pnpm generate:client` after API changes
```

### Package-Level CLAUDE.md

Keep minimal — most context should be in root. Only package-specific gotchas and commands.

```markdown
# @org/api

REST API server. Express + TypeORM + PostgreSQL.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Dev server with hot reload |
| `pnpm db:migrate` | Run pending migrations |

## Gotchas

- Circular dependency between `UserService` and `AuthService` — use lazy imports
```

---

## CLAUDE.local.md Patterns

```markdown
# CLAUDE.local.md

## My Environment

- Dev API: http://localhost:3000
- Staging: https://staging.example.com
- Test user: admin@test.com / test123

## Preferences

- I prefer verbose test output (`--verbose`)
- Skip e2e tests locally — CI handles them
```

Keep under 50 lines. Personal preferences, local URLs, test data. Not checked into git.

---

## Emphasis Patterns

Use sparingly for high-impact rules:

| Pattern | When to use |
|---------|-------------|
| `IMPORTANT:` | Rule where violation causes real damage |
| `YOU MUST` | Mandatory action before/after a workflow step |
| `NEVER` | Hard prohibition — violation always breaks something |
| `CRITICAL:` | Reserved for 1-2 rules per file max |

Overuse degrades all emphasis. If everything is IMPORTANT, nothing is.
