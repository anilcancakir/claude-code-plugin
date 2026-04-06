# CLAUDE.md Dedup Guide

Deduplication boundaries specific to CLAUDE.md files. For general CC component dedup, see `cc-dedup-guide.md` in prompt-writer references.

## Principle

Every piece of information should live in exactly one place. Duplication wastes tokens (loaded every turn) and risks conflicting versions.

---

## CC System Prompt → CLAUDE.md Boundary

CC system prompt already provides (NEVER include in any CLAUDE.md):

| CC provides | Don't repeat |
|------------|--------------|
| Tool schemas (Read, Grep, Glob, Bash, Edit, Write) | Tool usage instructions |
| Environment info (OS, shell, platform) | Environment detection |
| Agent spawning mechanics | How to use Agent tool |
| Output formatting, markdown rules | Formatting guidelines |
| Emoji policy | Emoji rules |
| Git safety protocol | Git commit instructions (unless project-specific) |
| File search guidance | How to search files |
| Permission system | How permissions work |

**Test**: If removing a line from CLAUDE.md causes zero behavior change (because CC already knows it), delete the line.

---

## Global CLAUDE.md → Project CLAUDE.md Boundary

Global CLAUDE.md covers (NEVER duplicate in project CLAUDE.md):

| Global covers | Project should NOT include |
|--------------|---------------------------|
| Identity, communication style | "Be direct", "code first" |
| Tech stack (language versions) | "We use TypeScript" (already in global) |
| Workflow protocol (intent gate, delegation) | Planning/verification instructions |
| Coding rules (TDD, strict types, linting) | "Write tests first", "use strict types" |
| Tool preferences (LSP, MCP) | How to use MCP servers |
| Skill invocation patterns | When to invoke skills |

**Project CLAUDE.md should only contain**:
- Project-specific commands (build, test, lint with exact flags)
- Project architecture (annotated tree)
- Project key files (entry points, configs)
- Project code style (conventions from THIS codebase)
- Project gotchas (quirks of THIS project)
- Project testing patterns (THIS project's test setup)

**Test**: If a line applies to all your projects equally, it belongs in global CLAUDE.md.

---

## Project CLAUDE.md → .claude/rules/ Boundary

| CLAUDE.md | .claude/rules/ |
|-----------|---------------|
| Project-wide context (architecture, commands) | File-path-specific conventions |
| General code style (applies everywhere) | Module-specific patterns |
| Testing commands | Testing patterns for specific test dirs |
| Project-wide gotchas | Gotchas for specific directories |

**Decision**: Does this convention apply to ALL project files or only specific paths?
- All files → CLAUDE.md
- Specific paths → `.claude/rules/` with `paths:` frontmatter

**Example split**:
```
# CLAUDE.md (project-wide)
- Service methods return Result<T, AppError> — never throw

# .claude/rules/api.md (path: "src/api/**/*.ts")
- Route handlers validate with Zod before business logic
- Use withAuth() HOC for authenticated routes
```

---

## CLAUDE.md → my-coding Skill Boundary

| CLAUDE.md Rules section | my-coding skill |
|------------------------|-----------------|
| 3-5 high-impact rules | Full coding standard |
| Enforcement-level statements | Detailed patterns, examples |
| Brief imperatives | Anti-patterns with explanations |

**Pattern**: CLAUDE.md holds the "what" (brief rules), my-coding holds the "how" (detailed guide).

```markdown
# In CLAUDE.md
## Rules
- Strict types — every param, return, property typed.
- Detailed coding rules → `my-coding` skill.

# In my-coding SKILL.md
## Type Safety
- Every function parameter must have explicit type annotation
- Return types required on all exported functions
- Use `unknown` over `any` — narrow with type guards
- Generics: prefer constraints (`T extends Base`) over loose `T`
[... 20+ more detailed rules]
```

---

## CLAUDE.md → README.md Boundary

| CLAUDE.md | README.md |
|-----------|-----------|
| Developer tooling context for Claude | Human-readable project docs |
| How to build/test/lint (machine context) | How to install/setup (human onboarding) |
| Architecture for code navigation | Architecture for understanding |
| Gotchas for avoiding mistakes | Getting started guide |

No overlap needed. CLAUDE.md is for Claude's context window. README.md is for human developers.

---

## Cross-File Dedup Decision Tree

For each piece of information:

```
1. Is it in CC system prompt already?
   YES → Delete. CC knows it.

2. Does it apply to ALL your projects?
   YES → Put in global ~/.claude/CLAUDE.md
   NO  → Continue

3. Is it specific to a file path pattern?
   YES → Put in .claude/rules/<name>.md with paths: frontmatter
   NO  → Continue

4. Is it a detailed coding standard (10+ rules)?
   YES → Put in my-coding skill. Add 3-5 summary rules to CLAUDE.md
   NO  → Continue

5. Is it project-specific context?
   YES → Put in project CLAUDE.md
   NO  → Don't include it anywhere — it's noise
```

---

## Common Duplication Mistakes

| Mistake | Fix |
|---------|-----|
| "Use TypeScript strict mode" in both global and project | Keep in global only (or rules/) |
| Workflow instructions in project CLAUDE.md | Already in global — delete from project |
| "Always write tests" in CLAUDE.md | Already in global rules — delete |
| Detailed coding rules in both CLAUDE.md and my-coding | Keep brief 3-5 in CLAUDE.md, detailed in my-coding |
| Architecture in both CLAUDE.md and README | CLAUDE.md for navigation, README for onboarding — different formats OK |
| Same gotcha in CLAUDE.md and .claude/rules/ | Choose one: project-wide → CLAUDE.md, path-specific → rules |
| Tool usage instructions in CLAUDE.md | CC system prompt handles this — delete |
| "Be concise" or "code first" in project CLAUDE.md | Identity belongs in global — delete from project |
