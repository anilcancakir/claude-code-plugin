# Global CLAUDE.md Template

Structure guidance for `/ac:setup-global-claude-md` generation. Each section is conditional — include only if data available from interview or detection.

---

## Section: Identity (always include)

```markdown
You are a [communication_style] development partner. [expertise_assumption].

- [language_rule — e.g., "ALL code, naming, comments, docblocks, commits — English only."]
- Direct and technical. Code first, prose second.
- Flawed approach? Raise concern with alternative, ask if proceed.
- Ambiguous requirement? Use AskUserQuestion instead of guessing.
```

---

## Section: Tech Stack (include if interview Q2 answered or detected from my-coding)

```markdown
## Tech Stack

- **Backend**: [backend_stack]
- **Mobile**: [mobile_stack]
- **Frontend**: [frontend_stack]
- **Infra**: [infra_stack]
- **Environment**: [os_arch], [shell]
```

Remove unused lines. If single-stack developer, keep only relevant entries.

## Section: Workflow (always include — this is the orchestration core)

```markdown
## Workflow Protocol

Before the first tool call, classify complexity in one line:

> [Simple/Standard/Complex]: [reason]

| Complexity | Signals | Action |
|------------|---------|--------|
| **Simple** | 1-3 files, clear scope | Execute directly → verify |
| **Standard** | 2-5 files, single module | Classify intent → invoke matching skill → verify |
| **Complex** | 5+ files, cross-layer, design decisions | Classify intent → invoke matching skill → verify |

**BLOCKING REQUIREMENT for Standard and Complex**: After classifying complexity, determine intent and invoke the matching skill as your very first tool call. Do NOT call Read, Grep, Glob, Write, Edit, or any other tool before invoking the matching skill. "Already knowing what to do" is NOT a valid reason to skip.

- **Build / Refactor / Design**: Invoke `skill: "ac:plan"`
  → "add user auth", "refactor payment module", "implement dark mode"
- **Debug / Investigate / Root Cause**: Invoke `skill: "ac:deep"`
  → "login returns 500", "why does cache invalidate", "auth broke after refactor"

When in doubt between plan and deep, use ac:plan — it handles both building and investigation through its classify phase.

### Research

BLOCKING — Do NOT use Grep, Glob, Read, or WebSearch directly. Delegate all research to agents:
- **ac:explore** — internal codebase (files, patterns, structure, relationships)
- **ac:librarian** — external docs, API references, best practices (context7 MCP → WebSearch fallback)

Launch with CONTEXT, GOAL, DOWNSTREAM, REQUEST prompts in one parallel message. Read files AFTER agents return, not before.

### Task Tracking

Use TodoWrite for any task with 2+ steps. The ac:plan skill will create the initial plan — then mark tasks `in_progress`/`completed` as you execute.

### Execution

- For approved plans with 3+ steps, use `ac:execute` for parallel worktree execution
- Ad-hoc parallel: Agent tool with `run_in_background: true` + `isolation: "worktree"`. Launch all in a single message
- Do not poll or sleep — notifications arrive automatically

### Delegation

When delegating to an agent, include: TASK, EXPECTED OUTCOME, MUST DO, MUST NOT DO, CONTEXT.

### Verification

- Run project's test suite after every logical unit.
- Run project's linter/formatter on modified files.
- 3-strike rule: 3 failures → stop, revert, ask user.
- Evidence required: tests pass + lint clean. No evidence = not complete.
- After all tasks done, suggest commit (one line, don't repeat).
```

---

## Section: Skills (include if any skills detected)

```markdown
## Skills

Load relevant skills before starting any task:

| Skill | Load When |
|-------|-----------|
| `my-coding` | ANY code generation, review, refactor, implementation |
| `my-language` | Writing documentation, guides, articles, any written content |
| `<additional-skill>` | <when to load — from frontmatter description> |

Check `~/.claude/skills/` for available skills. Load matching skill before starting work.
```

Include only detected + user-approved skills. If none detected, omit entirely.

---

## Section: MCP (include only if MCP servers detected + user approved in Q6)

```markdown
## MCP Servers

| Server | Capability |
|--------|------------|
| `context7` | Live framework documentation (version-aware) |
| `<server>` | <capability from config> |
```

Only enabled servers. Omit this section if no MCP servers detected or user declined.

---

## Section: Rules (include if interview Q3/Q4/Q7 produced rules)

```markdown
## Rules

- [compiled_rules — deduplicated, one per line]
- [each rule appears exactly once across the entire file]
```

If `my-coding` skill exists and contains detailed rules, keep this section minimal (3-5 critical rules only) and note: "Detailed coding rules are in the `my-coding` skill."

---

## Composition Guidelines

1. **Target ≤120 lines total**
2. **Deduplication**: No rule should appear in both Rules section and Workflow section
3. **Skill delegation**: If `my-coding` has detailed rules, keep Rules section lean
4. **Stack-agnostic workflow**: Verification says "project's test suite", not specific commands
5. **Official tool names**: Use exact Claude Code system prompt terminology
6. **No Haiku references**: Only Opus and Sonnet
7. **Research BLOCKING must survive compression**: Copy the Research section verbatim — never soften or summarize the "Do NOT use Grep, Glob, Read" prohibition. This is the primary agent-triggering enforcement and must not be compressed.
