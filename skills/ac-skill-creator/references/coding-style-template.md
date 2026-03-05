# Coding Style Skill Template

Reference template for generating personalized coding style skills. Read this file when creating a `my-coding` style skill via the `/setup-ac-coding` command.

---

## SKILL.md Structure

```markdown
---
name: my-coding
description: Enforce [developer name]'s coding style, conventions, and architectural philosophy when writing code. Code must look like artisanship — clean, typed, documented, tested, linter-clean. Use for ALL code generation, implementation, refactoring, and code review tasks. Triggers on any request to write, modify, review, or generate code. Core tenets — (1) [tenet], (2) [tenet], (3) [tenet]. Load language-specific references when working in those languages.
---

# [Developer Name] Coding Style

[1-2 sentence philosophy statement. What does "good code" mean to this developer?]

## North Star: [Inspiration Source]

[2-3 sentences describing the gold standard. What existing codebase, framework, or style guide inspires this developer's approach? Apply these principles universally.]

- **[Principle 1]** — [concrete example]
- **[Principle 2]** — [concrete example]
- **[Principle 3]** — [concrete example]

## CRITICAL: Adapt to Project's Language Version

[Version detection instructions. Check config files for language version. Use ONLY features available in that version.]

[Version feature gate table — only include for languages the developer uses]

## Non-Negotiable Rules

### 1. [Rule Name]

[1-sentence rule statement.]

\`\`\`[language]
// CORRECT
[correct example]

// WRONG — [why it's wrong]
[wrong example]
\`\`\`

### 2. [Rule Name]
[... repeat pattern for each rule ...]

[Target: 8-12 rules. Include rules for:]
- [ ] Language(s) — English only identifiers?
- [ ] Type safety — every parameter/return typed?
- [ ] Documentation — docblocks on public APIs?
- [ ] Line width — max character limit?
- [ ] Multi-line — collections always multi-line?
- [ ] Trailing commas — always?
- [ ] Imports — clean, grouped, never inline?
- [ ] TDD — test-first?
- [ ] Linter — zero tolerance?
- [ ] Step comments — numbered steps in complex methods?
- [ ] Enums — for status/type values?

## Architecture Principles

| Principle | Rule |
|-----------|------|
| [Name] | [One-sentence rule] |
| [Name] | [One-sentence rule] |
[... 5-8 principles ...]

## Error Handling

\`\`\`[language]
// PATTERN: [describe the pattern]
[code example]
\`\`\`

[1-2 sentences about what to never do]

## Formatting Quick Reference

| Setting | Value |
|---------|-------|
| Indent | [N spaces / tabs] |
| Max width | [N characters] |
| Line endings | [LF / CRLF] |
| Charset | [UTF-8] |
| Trailing commas | [Always / Never] |
| Collections | [Always multi-line / Contextual] |
| Linter | [Always passing / Best effort] |

## Language-Specific References

Load these when working in the respective language:

- **[Language 1]**: See [references/language-1.md](references/language-1.md) for [brief description]
- **[Language 2]**: See [references/language-2.md](references/language-2.md) for [brief description]
- **Anti-Patterns**: See [references/anti-patterns.md](references/anti-patterns.md) for the "never do" list
```

---

## Reference File Structure

### Language-Specific Reference (`references/{language}.md`)

Target: 200-400 lines per language file.

```markdown
# [Language] / [Framework] Conventions

- [Table of Contents with anchor links]

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
[... table of naming rules ...]

## Directory Structure

\`\`\`
[Annotated tree structure]
\`\`\`

**Key rules:**
- [Rule 1]
- [Rule 2]

## [Pattern 1] (e.g., Controller Pattern, Widget Architecture)

\`\`\`[language]
[Canonical code example]
\`\`\`

**Rules:**
- [Rule 1]
- [Rule 2]

[... repeat for each major pattern ...]

## Testing

[Test structure, framework, naming, fixture strategy]

## Tooling

| Tool | Config | Purpose |
|------|--------|---------|
[... table of tools ...]
```

### Anti-Patterns Reference (`references/anti-patterns.md`)

Target: 30-60 lines.

```markdown
# Anti-Patterns (Never Do)

## [Language 1]

| Anti-Pattern | Why | Do Instead |
|-------------|-----|------------|
[... table entries ...]

## All Languages

| Anti-Pattern | Why | Do Instead |
|-------------|-----|------------|
[... universal anti-patterns ...]
```

---

## Quality Rules for Generated Skills

1. SKILL.md body under 300 lines
2. Every non-negotiable rule has CORRECT/WRONG code example
3. Code examples use the developer's actual patterns (from analyzed projects)
4. No vague rules — "write clean code" is not a rule, "120-char max width" is
5. Architecture principles table has 5-8 rows
6. Formatting quick reference covers all settings
7. Anti-patterns table has at least 8 entries per language
8. All identifiers, comments, and examples in English
