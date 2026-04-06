# CC Deduplication Guide

What to omit from component prompts because Claude Code already provides it. Every token spent repeating CC infrastructure is a token stolen from your component's actual logic.

## CC System Prompt Auto-Injects

DO NOT repeat any of the following — CC injects these into every conversation automatically:

**Identity and Safety**
- "You are Claude Code, made by Anthropic" — identity statement
- Safety, security, and content policy rules
- Refusal behavior and escalation patterns

**Tool System**
- Complete tool schemas with parameter descriptions (Read, Write, Edit, Bash, Glob, Grep, Agent, etc.)
- Tool usage guidelines and best practices
- Permission escalation flow (allow/deny/allowlist)
- File path instructions (absolute paths, quoting)

**Context Cascade**
- CLAUDE.md loading order: Managed CLAUDE.md -> User global -> Project -> Local -> .claude/rules/
- Memory system instructions
- Project context injection

**Output Behavior**
- Emoji rules (no emojis unless requested)
- Output formatting conventions
- Communication style guidelines
- Git commit conventions

**Agent System**
- Subagent spawning mechanics
- Fork vs subagent vs teammate architecture
- Agent tool restrictions propagation

## CLAUDE.md Provides

DO NOT duplicate in component prompts — the model already has this context:

- Project architecture and directory structure
- Build, test, lint commands
- Stack information (languages, frameworks, versions)
- Agent/command/skill tables and descriptions
- Design principles and conventions
- Model routing rules
- Verification workflow

## Components MUST Provide

Only these categories earn their tokens in a component prompt:

**Core Mission** — What this specific component does that nothing else does.

**Decision Logic** — Domain-specific decision trees. "If coverage <80%, escalate to senior tier." "If agent returns REJECT, halt pipeline."

**Domain Patterns** — Patterns unique to this component's scope. Not general coding patterns — those belong in `my-coding` skill or CLAUDE.md.

**Failure Conditions** — When the component has FAILED. Concrete, testable conditions. "FAILED if: modified files not in step list, tests fail unfixed, no structured report."

**Context-Specific Constraints** — Scope boundaries this component must respect. "Read-only. No file writes." "Only touch files listed in briefing."

**Output Format** — Exact structure of what to return. Template with field names and descriptions.

## Anti-Patterns

| Anti-Pattern | Fix |
|---|---|
| "You are Claude Code..." | Remove — CC injects identity |
| Listing available tools | Remove — CC injects tool schemas |
| Explaining permission flow | Remove — CC handles permissions |
| "Always use absolute paths" | Remove — CC system prompt covers this |
| "Files are analyzed by the agent" | Active imperative: "Analyze files" |
| General error recovery instructions | Remove unless domain-specific recovery |
| Explaining what CLAUDE.md contains | Remove — model already has it loaded |
| "Remember to check CLAUDE.md for..." | Remove — CLAUDE.md is auto-injected |
| Repeating tool parameter formats | Remove — CC injects full schemas |
| "You can use Read to view files" | Remove — tool availability is auto-injected |
| "Be helpful and thorough" | Remove — CC identity covers disposition |
| Listing all agent types and their models | Remove — CLAUDE.md agent table covers this |

## Decision Flowchart

Before writing any instruction, ask:

1. Does CC system prompt already say this? -> Omit
2. Does CLAUDE.md already say this? -> Omit
3. Does `my-coding` skill already say this? -> Omit
4. Is this general knowledge Claude already has? -> Omit
5. Is this specific to THIS component's mission? -> Include
6. Is this a domain-specific decision tree? -> Include
7. Is this a failure condition unique to this workflow? -> Include

If you pass steps 1-4 without omitting, include it. If caught at steps 1-4, remove it.
