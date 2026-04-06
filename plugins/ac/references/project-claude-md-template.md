# Project CLAUDE.md Template

Structure guidance for `/ac:init-claude-md` generation. Each section is conditional — include only if content was discovered.

## Core Principle

CLAUDE.md = project-level context, not rules. Rules → `.claude/rules/*.md`.

## Deduplication with Global CLAUDE.md

The global `~/.claude/CLAUDE.md` already covers:

- Workflow protocol (complexity classification, planning, verification)
- Tool usage (TodoWrite, Agent, Explore, Skill, AskUserQuestion)
- Delegation rules, 3-strike rule, pre-authorization patterns
- Identity, communication style, model awareness
- Tech stack, coding rules (TDD, linter, etc.)

**NEVER duplicate these in project-level CLAUDE.md.** Project-level = project-specific facts only.

## Token Budget

- Target: ≤2500 tokens (~100-120 lines)
- Injected every conversation turn — every token costs every turn
- Over budget → trim least-critical sections, defer to rules files

## Anti-Slop Checklist

Before finalizing, verify NONE of these appear:

- [ ] Obvious instructions ("write tests", "handle errors")
- [ ] Generic practices ("follow SOLID", "DRY")
- [ ] File listings discoverable via Glob
- [ ] Setup/installation steps
- [ ] Verbose multi-line explanations
- [ ] Made-up sections not from codebase

---

## Section: Header (always include)

```markdown
# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.
```

---

## Section: Commands (include if commands found)

Copy-paste-ready. No `npm install` or obvious setup steps.

```markdown
## Commands

| Command | Description |
|---------|-------------|
| `<build command>` | <description> |
| `<test command>` | <description> |
| `<lint command>` | <description> |
| `<dev command>` | <description> |
```

---

## Section: Architecture (include if non-trivial project)

Non-obvious structure only. Skip directories whose purpose is clear from name.

```markdown
## Architecture

<annotated tree — depth 2 max, non-obvious purpose only>
```

---

## Section: Key Files (include if entry points or critical configs found)

Only files Claude wouldn't find easily on its own.

```markdown
## Key Files

- `<path>` - <purpose>
```

---

## Section: Code Style (include if project-specific conventions found)

Imperative statements. Only project-specific — not generic best practices.

```markdown
## Code Style

- <imperative convention from project source>
```

---

## Section: Testing (include if test infrastructure found)

```markdown
## Testing

- `<test command>` - <scope>
- <testing convention>
```

---

## Section: Gotchas (include if non-obvious quirks found)

```markdown
## Gotchas

- <non-obvious quirk>
- <anti-pattern found in source comments>
```

---

## Section: Skills & Extensions (include only if detected + user approved)

```markdown
## Skills & Extensions

- `skill: "<name>"` — <when to invoke>
- MCP: `<server>` — <capability>
```
