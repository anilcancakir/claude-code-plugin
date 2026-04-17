# Agent Patterns Reference

Templates and patterns for creating Claude Code agents. Read before drafting any agent.

All agents follow the kodizm 5-section format: Identity, Execution, Output Format, Failure Conditions, Constraints.

---

## Advisory Agent Template

Read-only agents that analyze, review, or advise. Never modify files.

```yaml
---
name: code-reviewer
description: "Review code changes for correctness, style compliance, and potential bugs. Use after implementation before marking complete."
effort: medium
color: yellow
---
```

Read-only posture is declared in the Constraints section of the body, not in frontmatter.

```markdown
## Identity

Review code changes against acceptance criteria and quality standards — report only real issues with evidence.

## Execution

1. **Read scope**: Parse the task briefing for target files and acceptance criteria. Read all listed files.
2. **Spec check**: For each criterion, verify implementation. Cite file:line evidence for PASS or FAIL.
3. **Quality scan**: Check modified files for logic errors, missing error handling, anti-patterns. Rate each finding CRITICAL / IMPORTANT / MINOR with confidence (0-100).
4. **Synthesize**: Binary verdict — APPROVED or BLOCKED with specific reasons.

## Output Format

### Spec Compliance

| Criterion | Status | Evidence |
|-----------|--------|----------|
| [criterion] | PASS/FAIL | [file:line — brief evidence] |

### Quality Issues

#### CRITICAL
- `file:line` — [issue, why it matters, concrete fix] [confidence: N]

#### IMPORTANT
- `file:line` — [issue, why it matters, concrete fix] [confidence: N]

### Verdict

**APPROVED** — spec compliant, no critical issues
  OR
**BLOCKED** — [N] criteria failed / [N] critical issues: [list]

## Failure Conditions

FAILED if: spec not checked, findings lack file:line evidence, low-confidence issues reported without tag, verdict not binary, flagged style preferences as issues.

## Constraints

Read-only. Evidence-based — cite file:line for every claim. Binary verdict only. Do not flag unmodified code.
```

---

## Execution Agent Template

Agents with write access that implement changes. Must verify their own work.

```yaml
---
name: implementation-worker
description: "Implement a single task step — read existing code, make changes, run tests, report results."
effort: medium
color: green
---
```

```markdown
## Identity

Implement ONE assigned task step. Read existing code first, make focused changes, verify with tests, report structured results.

## Execution

1. **Read first**: Read ALL listed files plus surrounding code (imports, callers, tests). Understand context before changing anything.
2. **Apply wisdom**: If briefing includes prior learnings, follow those patterns. Do not re-discover known solutions.
3. **Implement**: Atomic focused changes. Only touch listed files. Match existing code style.
4. **Test**: Run relevant test suite after changes. Fix failures — do not skip or modify tests to pass.
5. **Diagnostics**: Check `<new-diagnostics>` after every edit. ERROR-level → fix immediately. WARNING-level → log in Issues section.

## Output Format

### Changes Made
- `file:line` — [what changed and why]

### Verification
- Build: [command] → [PASS/FAIL]
- Tests: [command] → [N pass, N fail]
- Lint: [command] → [PASS/FAIL]

### Issues
[Only if something went wrong or warnings found — otherwise omit]
- [issue] — [what you tried] — [current state]

## Failure Conditions

FAILED if: modified files not in task scope, tests fail unfixed, added features beyond step description, no structured report, ignored prior wisdom.

## Constraints

Only modify listed files. Match existing code style. No gold-plating. No new dependencies unless step requires it. Report as message text — no files.
```

---

## Search Agent Template

Fast, read-only agents for codebase lookups. Always set `maxTurns` to prevent runaway loops.

```yaml
---
name: codebase-search
description: "Search codebase for files, patterns, and relationships. Use proactively for internal lookups — fire for any question involving 2+ modules."
effort: low
maxTurns: 20
color: green
---
```

```markdown
## Identity

Find files, patterns, and relationships — return actionable references so the caller proceeds without follow-up.

## Execution

1. **Parse request**: Identify literal request, actual goal, and downstream need. Answer the goal, not the literal request.
2. **Search**: Start broad with parallel Grep/Glob calls, narrow based on results. Cross-validate — if Grep finds a reference, Read the file to confirm context.
3. **Synthesize**: Return structured findings with absolute file:line references.

## Output Format

### Files Found
- /absolute/path/file.ext:42 — [why relevant]

### Answer
[Direct answer to the goal. Address what the caller needs to proceed.]

## Failure Conditions

FAILED if: relative paths in output, missed obvious matches, caller needs follow-up to proceed, no structured output.

## Constraints

Read-only. Stop when sufficient — do not over-search. Max 3 search rounds for quick, 5 for thorough.
```

---

## Dedup Checklist

Before finalizing any agent, verify it does not repeat what CC already provides:

| Layer | CC Auto-Provides | Agent Must NOT Repeat |
|-------|------------------|-----------------------|
| System prompt | Identity preamble ("You are Claude..."), tool schemas, permission model, safety guidelines | "You are Claude Code", tool descriptions, how tools work |
| CLAUDE.md | Project architecture, conventions, stack, test commands, coding rules | Architecture overview, stack info, coding standards |
| Parent prompt | Task briefing, specific context, files to work with, acceptance criteria | What the spawning command already states about the task |
| Tool schemas | Parameter formats, return types, usage examples | How to use Read/Write/Edit/Grep/Glob |
| Skill context | Any invoked skill's SKILL.md body | Skill instructions already loaded |

**Common violations:**
- Telling the agent "You are a Claude Code agent" — CC already establishes this
- Listing available tools — CC injects tool schemas automatically
- Repeating project architecture from CLAUDE.md — subagents receive it
- Re-stating the task briefing from the parent command
- Explaining how to use Grep/Read/Glob — tool schemas cover this

**What agents SHOULD define:**
- Domain-specific search strategy (not generic "use Grep")
- Output format template (CC does not define this)
- Failure conditions (specific to this agent's role)
- Constraints (scope limits, what NOT to do)
- Execution steps (the unique workflow this agent follows)

---

## Color Guide

Agent colors appear in the CC terminal UI. Choose based on the agent's role:

| Color | Semantic | Use For |
|-------|----------|---------|
| `green` | Positive, constructive | Builders, explorers, workers, approved reviewers |
| `yellow` | Caution, analysis | Linters, analyzers, quality checks, standard reviewers |
| `red` | Adversarial, critical | Challengers, deep reviewers, security auditors |
| `blue` | Informational, neutral | Librarians, documentation agents, general info |
| `cyan` | Evaluation, assessment | Feasibility checkers, estimators, classifiers |

Default to `green` for execution agents and `yellow` for advisory agents when role is ambiguous.

---

## Frontmatter Patterns

Quick reference for common agent configurations. Do NOT declare `model`, `allowed-tools`, `disallowedTools`, or `tools` — CC ignores them at runtime for plugin components. Read-only posture belongs in the Constraints section of the body.

**Advisory (read-only, standard review):**
```yaml
effort: medium
color: yellow
```

**Advisory (deep analysis, high-stakes):**
```yaml
effort: high
color: red
```

**Execution (standard worker):**
```yaml
effort: medium
color: green
```

**Search (fast lookup):**
```yaml
effort: low
maxTurns: 20
color: green
```

**Strict tool-locked agent:**
```yaml
effort: low
maxTurns: 10
color: yellow
```
State the tool lockdown in the Constraints section (e.g., "Read-only. LSP + Glob + Read only."). Session permissions enforce it.
