# Skill Patterns Reference

Skill-specific patterns extracted from Anthropic's official plugins and Claude Code documentation. Read before drafting any skill component.

## Contents

- [How Skills Appear to the Model](#how-skills-appear-to-the-model)
- [Description Patterns](#description-patterns)
- [Invocation Control Matrix](#invocation-control-matrix)
- [String Substitutions and Shell Injection](#string-substitutions-and-shell-injection)
- [Context Fork Pattern](#context-fork-pattern)
- [Size Guidelines](#size-guidelines)
- [Reference Wiring Patterns](#reference-wiring-patterns)
- [Skill Directory Structure](#skill-directory-structure)
- [Common Mistakes](#common-mistakes)

---

## How Skills Appear to the Model

### Skill Listing (system-reminder injection)

At session start, CC injects skill metadata into `<system-reminder>` blocks:

```
<system-reminder>
The following skills are available for use with the Skill tool:

- simplify: Review changed code for reuse, quality, and efficiency, then fix any issues found.
- keybindings-help: Use when the user wants to customize keyboard shortcuts, rebind keys, add chord bindings, or modify ~/.claude/keybindings.json. Examples: "rebind ctrl+s", "add a chord shortcut"…
- claude-api: Build apps with the Claude API or Anthropic SDK.
TRIGGER when: code imports `anthropic`/`@anthropic-ai/sdk`/`claude_agent_sdk`…
DO NOT TRIGGER when: code imports `openai`/other AI SDK…
</system-reminder>
```

Key observations:
- Format: `- name: description…` (one line per skill)
- Long descriptions truncated with `…` at 250 characters
- This is ALL the model sees until it decides to invoke a skill
- Model is told: "When a skill matches the user's request, this is a BLOCKING REQUIREMENT: invoke the relevant Skill tool BEFORE generating any other response"

### Skill Body Injection (on invocation)

When the model invokes a skill via the Skill tool, CC injects the full body:

```
### Skill: {name}
Path: {path}

{full SKILL.md content}
```

On context compaction, skill bodies are truncated to 5,000 tokens with an ellipsis and a Read suggestion.

### Token Budget

- Skill listing: ~100 tokens per skill (metadata only)
- Invoked skill body: up to 5,000 tokens per skill (compaction limit)
- Total invoked skills context: 25,000 tokens

---

## Description Patterns

Four proven patterns observed across official plugins.

### Pattern A — Capability + Usage (simplest)

```yaml
description: "Review changed code for reuse, quality, and efficiency, then fix any issues found."
```

Best for: single-purpose skills with obvious trigger context.

### Pattern B — When-to-use + Examples (most common)

```yaml
description: "Use when the user wants to customize keyboard shortcuts, rebind keys, add chord bindings, or modify keybindings.json. Examples: 'rebind ctrl+s', 'add a chord shortcut', 'customize keybindings'."
```

Best for: skills that need explicit trigger phrases to avoid undertriggering.

### Pattern C — Purpose + TRIGGER/DO NOT TRIGGER (auto-invoked)

```yaml
description: "Build apps with the Claude API or Anthropic SDK."
when_to_use: "TRIGGER when: code imports `anthropic`/`@anthropic-ai/sdk`/`claude_agent_sdk`, or user asks to use Claude API, Anthropic SDKs, or Agent SDK. DO NOT TRIGGER when: code imports `openai`/other AI SDK, general programming questions."
```

Best for: skills that must fire automatically based on code context, with clear counter-examples.

### Pattern D — Capability + Trigger phrases in quotes

```yaml
description: "This skill should be used when the user asks to 'create a hook', 'add a PreToolUse hook', 'validate tool use', 'implement prompt-based hooks', or mentions hook events, tool validation, or skill lifecycle automation."
```

Best for: domain-specific skills where exact user phrases predict intent. Used by 8 of 15 official plugin skills.

### Description Optimization Tips

1. Front-load the key use case — first 250 chars are all the model sees
2. Include both WHAT it does AND WHEN to use it
3. List specific trigger phrases in quotes: `"create a skill"`, `"add a hook"`
4. Add "or mentions X" / "or discusses Y" for edge case coverage
5. Be slightly pushy — Claude undertriggers skills by default
6. Third person: "Processes files" not "I process files"
7. Never start with "Teaches" or "Provides" — use action verbs

---

## Invocation Control Matrix

| Frontmatter | User can invoke | Claude can invoke | In system prompt listing |
|-------------|-----------------|-------------------|--------------------------|
| (default) | Yes | Yes | Yes — description visible |
| `user-invocable: false` | No | Yes | No — hidden from listing AND / menu |
| `disable-model-invocation: true` | Yes | No | No — completely hidden |

Decision tree:
- Internal workflow skills Claude must not auto-discover (qa-patterns, browser-qa) → `user-invocable: false`
- Manual-only tools (setup wizards, destructive operations) → `disable-model-invocation: true`
- Everything else → defaults (both can invoke, description visible)

---

## String Substitutions and Shell Injection

### Available Variables

Replaced at skill load time:

| Variable | Description |
|----------|-------------|
| `$ARGUMENTS` | All arguments passed on invocation |
| `$arg_name` | Named argument (from `arguments:` list) |
| `${CLAUDE_SESSION_ID}` | Current session ID |
| `${CLAUDE_SKILL_DIR}` | Absolute path to this skill's directory |

### Shell Injection (Dynamic Context)

Backtick-wrapped commands prefixed with `!` execute at skill load time — model sees only the output:

```markdown
## Current State
- Branch: !`git branch --show-current`
- Recent changes: !`git log --oneline -5`
- PR diff: !`gh pr diff`
```

Multi-line variant:

````markdown
```!
git status --short
git log --oneline -3
```
````

Disable via `"disableSkillShellExecution": true` in settings.

---

## Context Fork Pattern

Run a skill in an isolated subagent — useful for contained, parallelizable work:

```yaml
---
name: pr-summary
context: fork
agent: Explore
---

Summarize this PR:
- PR diff: !`gh pr diff`
- PR comments: !`gh pr view --comments`
```

Use `context: fork` when: skill is self-contained, may run in parallel, or needs isolation from main conversation. The `agent:` field selects the subagent type (Explore, general-purpose, or custom plugin agent name).

---

## Size Guidelines

| Type | Target | Max | Notes |
|------|--------|-----|-------|
| Skill | 200-500 lines | 500 lines | Move detail to references/ |

Official Anthropic skills range 200-800 lines. If approaching 500 lines, move content to references/.

---

## Reference Wiring Patterns

CC does NOT auto-load `references/` files. The model never sees them unless SKILL.md explicitly points to them.

### Inline Link at Point of Use

```markdown
Read `references/syntax.md` for full YAML reference when generating workflow files.
```

### Table Pattern (for 3+ files)

```markdown
## References

| Topic | File | When to read |
|-------|------|-------------|
| YAML syntax | [workflow-syntax.md](references/workflow-syntax.md) | When generating workflow files |
| Security | [security-patterns.md](references/security-patterns.md) | Every workflow — apply all patterns |
```

### Orphan File Check

Verify every file in `references/`, `scripts/`, and `assets/` is reachable from SKILL.md — orphan files are invisible to the model.

---

## Skill Directory Structure

### Minimal

```
my-skill/
└── SKILL.md              # Required — frontmatter + body
```

### Standard

```
my-skill/
├── SKILL.md              # Required — overview and navigation
└── references/
    ├── api-reference.md  # Loaded on-demand via Read
    └── patterns.md       # Loaded on-demand via Read
```

### Complete

```
my-skill/
├── SKILL.md              # Required — overview and navigation
├── references/
│   ├── syntax.md         # Detailed docs (with TOC if >100 lines)
│   └── templates.md      # Code patterns and examples
├── scripts/
│   └── validate.py       # Executed, source NOT loaded into context
└── assets/
    └── viewer.html       # Static files, templates
```

One level deep rule: CC reliably reads `SKILL.md → references/file.md`. Chains like `SKILL.md → advanced.md → details.md` break — CC may only `head -100` deeply nested files.

---

## Common Mistakes

| Anti-Pattern | Fix |
|---|---|
| Description >250 chars without `when_to_use` | Split: short `description` + detailed `when_to_use` |
| `user-invocable: true` on every skill | Omit — `true` is the default. Only set `false` for internal-only skills |
| `allowed-tools` / `disallowedTools` / `model` in frontmatter | Remove — CC ignores these for plugin components |
| References without "read this when" guidance | Always explain when the model should read each reference |
| Deeply nested reference chains | Keep all references one level from SKILL.md |
| Hardcoded file paths or usernames | Use `${CLAUDE_SKILL_DIR}` or `${CLAUDE_PLUGIN_ROOT}` variables |
| Orphan reference files | Every file in references/ must be linked from SKILL.md |
