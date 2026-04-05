# Prompt Patterns Reference

Patterns from Anthropic's official plugins and Claude Code documentation. Read this file when drafting any Claude Code component.

## Contents

- [How Skills Appear to the Model](#how-skills-appear-to-the-model)
- [Skill Description Patterns](#skill-description-patterns-proven)
- [Agent Patterns](#agent-patterns)
- [Command Patterns](#command-patterns-phase-based)
- [Rule Patterns](#rule-patterns)
- [Skill Directory Structure](#skill-directory-structure)
- [Common Mistakes](#common-mistakes)

---

## How Skills Appear to the Model

Understanding how CC presents skills is essential for writing effective descriptions and bodies.

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

**Key observations:**
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

On context compaction, skill bodies are truncated to 5,000 tokens with: `[... skill content truncated for compaction; use Read on the skill path if you need the full text]`

### Total Token Budget

- Skill listing: ~100 tokens per skill (metadata only)
- Invoked skill body: up to 5,000 tokens per skill (compaction limit)
- Total invoked skills context: 25,000 tokens

---

## Skill Description Patterns (Proven)

Three patterns observed across all official plugins:

### Pattern A: Capability + Usage (simplest)

```yaml
description: "Review changed code for reuse, quality, and efficiency, then fix any issues found."
```

Best for: Single-purpose skills with obvious trigger context.

### Pattern B: When-to-use + Examples (most common)

```yaml
description: "Use when the user wants to customize keyboard shortcuts, rebind keys, add chord bindings, or modify keybindings.json. Examples: 'rebind ctrl+s', 'add a chord shortcut', 'customize keybindings'."
```

Best for: Skills that need explicit trigger phrases to avoid undertriggering.

### Pattern C: Purpose + TRIGGER/DO NOT TRIGGER (auto-invoked)

```yaml
description: "Build apps with the Claude API or Anthropic SDK."
when_to_use: "TRIGGER when: code imports `anthropic`/`@anthropic-ai/sdk`/`claude_agent_sdk`, or user asks to use Claude API, Anthropic SDKs, or Agent SDK. DO NOT TRIGGER when: code imports `openai`/other AI SDK, general programming questions."
```

Best for: Skills that must fire automatically based on code context, with clear counter-examples.

### Pattern D: Capability + Trigger phrases in quotes (official plugin-dev)

```yaml
description: "This skill should be used when the user asks to 'create a hook', 'add a PreToolUse hook', 'validate tool use', 'implement prompt-based hooks', or mentions hook events, tool validation, or skill lifecycle automation."
```

Best for: Domain-specific skills where exact user phrases predict intent. Used by 8 of 15 official plugin skills.

### Description Optimization Tips

1. Front-load the key use case — first 250 chars are all the model sees
2. Include both WHAT it does AND WHEN to use it
3. List specific trigger phrases in quotes: `"create a skill"`, `"add a hook"`
4. Add "or mentions X" / "or discusses Y" for edge case coverage
5. Be slightly pushy — Claude undertriggers skills by default
6. Third person: "Processes files" not "I process files"
7. Never start with "Teaches" or "Provides" — use action verbs

---

## Agent Patterns

### Minimal Agent Template (code-architect style)

```markdown
---
name: code-architect
description: "Senior software architect for designing implementation blueprints. Use when architecture decisions are needed before implementation."
model: opus
disallowedTools:
  - Write
  - Edit
  - NotebookEdit
---

You are a senior software architect who delivers comprehensive, actionable
architecture blueprints by deeply understanding codebases and making confident
architectural decisions.

## Core Process

**1. Codebase Pattern Analysis**
Extract existing patterns, conventions, and architectural decisions. Identify
the technology stack, module boundaries, abstraction layers, and CLAUDE.md
guidelines. Find similar features to understand established approaches.

**2. Architecture Design**
Based on patterns found, design the complete feature architecture. Make
decisive choices — pick one approach and commit. Ensure seamless integration
with existing code. Design for testability, performance, and maintainability.

**3. Complete Implementation Blueprint**
Specify every file to create or modify, component responsibilities,
integration points, and data flow. Break implementation into clear phases
with specific tasks.

## Output Guidance

Deliver a decisive, complete architecture blueprint. Include:

- **Patterns & Conventions Found**: Existing patterns with file:line references
- **Architecture Decision**: Chosen approach with rationale and trade-offs
- **Component Design**: Each component with file path, responsibilities, dependencies
- **Implementation Map**: Specific files to create/modify with descriptions
- **Data Flow**: Complete flow from entry points through transformations to outputs
- **Build Sequence**: Phased implementation steps as a checklist

Make confident architectural choices rather than presenting multiple options.
Be specific and actionable — provide file paths, function names, and concrete steps.
```

### Exploration Agent Template (code-explorer style)

```markdown
---
name: code-explorer
description: "Expert code analyst for tracing and understanding feature implementations. Use for codebase research, finding patterns, and mapping dependencies."
model: haiku
disallowedTools:
  - Write
  - Edit
  - NotebookEdit
---

You are an expert code analyst specializing in tracing and understanding
feature implementations across complex codebases.

## Core Mission

Trace through code comprehensively. Follow imports, function calls,
event handlers, and data transformations. Report findings with file:line
references for every claim.

## Analysis Approach

1. Map the entry points for the requested feature
2. Trace data flow through each layer
3. Identify patterns, abstractions, and conventions
4. Document dependencies and integration points
5. List 5-10 key files with their roles

## Output Guidance

- **Entry Points**: Where the feature starts (routes, event handlers, CLI)
- **Data Flow**: Step-by-step path through the codebase
- **Key Files**: 5-10 files with their roles and line ranges
- **Patterns**: Naming conventions, abstractions, architecture patterns
- **Dependencies**: External libraries, internal modules, shared state
```

---

## Command Patterns (phase-based)

### Phase Structure Template

```markdown
---
name: feature-dev
description: "Systematic feature development workflow"
argument-hint: "[feature description]"
model: sonnet
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Agent
  - Glob
  - Grep
---

You are helping a developer implement a new feature. Follow a systematic
approach: understand the codebase deeply, design elegant architectures,
then implement.

## Core Principles

- **Understand before acting**: Read and comprehend existing code patterns first
- **Ask clarifying questions**: Identify all ambiguities before designing
- **Simple and elegant**: Prioritize readable, maintainable code

---

## Phase 1: Discovery

**Goal**: Understand what needs to be built

**Actions**:
1. Parse the feature request from $ARGUMENTS
2. If unclear, use AskUserQuestion to clarify requirements
3. Summarize understanding: what will change, what will stay the same

---

## Phase 2: Codebase Exploration

**Goal**: Understand relevant existing code

**Actions**:
1. Launch 2-3 Explore agents in parallel, each targeting different aspects
2. Read all files identified by agents
3. Present summary: patterns found, conventions, architecture constraints

CRITICAL: This is one of the most important phases. DO NOT SKIP.

---

## Phase 3: Clarifying Questions

**Goal**: Resolve all ambiguities

**Actions**:
1. Identify underspecified aspects from exploration findings
2. Present all questions to the user in a clear, organized list
3. Wait for answers before proceeding to architecture design

---

## Phase 4: Architecture Design

**Goal**: Design the implementation strategy

**Actions**:
1. Launch a Plan agent with exploration findings and user preferences
2. Review the blueprint for alignment with existing patterns
3. Present architecture to user for approval

**DO NOT START IMPLEMENTATION WITHOUT USER APPROVAL**

---

## Phase 5: Implementation

**Goal**: Build the feature

**Actions**:
1. Create tasks via TodoWrite for each implementation step
2. Implement following codebase conventions
3. Run tests after each logical unit of work

---

## Phase 6: Quality Review

**Goal**: Verify implementation quality

**Actions**:
1. Run full test suite
2. Run linter on modified files
3. Review all changes with git diff
4. Present summary of what was done
```

---

## Rule Patterns

### Rule Frontmatter

Rules use minimal frontmatter — only `path` is meaningful:

```yaml
---
path: "src/**/*.ts"          # Glob pattern — rule activates for matching files (required)
description: "Optional description"  # Informational only, not used for triggering
---
```

Rules do NOT support: `model`, `allowed-tools`, `user-invocable`, `context`, `agent`, or any other skill/agent fields. They are flat bullet lists scoped to file paths.

### Path-Scoped Rule Template

```markdown
---
path: "lib/**/*.dart"
---

- Effective Dart style guide
- Use `const` constructors wherever possible
- Build methods under 50 lines
- Extract widgets instead of deep nesting
- Use BlocBuilder/BlocListener, avoid setState
- Prefer `final` for variables that do not change
- Feature-first directory structure: `lib/features/<name>/`
```

### Backend Rule Template

```markdown
---
path: "back-end/**/*.php"
---

- PSR-12 coding standard
- Resource Controllers, Form Requests, Eloquent scopes
- Validate via Form Request classes
- Use Eloquent relationships, not raw queries
- Avoid N+1 — use `with()` for eager loading
- Database transactions for multi-step writes
- Thin controllers — move logic to Service/Action classes
```

---

## Skill Directory Structure

### Minimal (no bundled resources)

```
my-skill/
├── SKILL.md              # Required — frontmatter + body
```

### Standard (with references)

```
my-skill/
├── SKILL.md              # Required — overview and navigation
├── references/
│   ├── api-reference.md  # Loaded on-demand via Read
│   └── patterns.md       # Loaded on-demand via Read
```

### Complete (all resource types)

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

**One level deep rule**: CC reliably reads `SKILL.md → references/file.md`. Chains like `SKILL.md → advanced.md → details.md` break — CC may only `head -100` deeply nested files.

---

## Common Mistakes

| Anti-Pattern | Fix |
|---|---|
| "You should consider..." | "Use X" or "Extract Y" |
| Nested lists 3+ deep | Flatten to max 1 nesting level |
| CRITICAL on every paragraph | Max 1-2 per file |
| Explaining basic concepts | Skip — Claude already knows |
| Multiple options without recommendation | Pick one, commit, explain why |
| Bold for inline emphasis | Only for headings and labels |
| Passive voice instructions | Active imperative: "Analyze", "Run" |
| 50+ word sentences | Break into 2-3 shorter sentences |
| Description >250 chars without `when_to_use` | Split: short `description` + detailed `when_to_use` |
| `allowed-tools` on agents | Use `disallowedTools` — agents use blacklist, not whitelist |
| `disallowedTools` on skills/commands | Use `allowed-tools` — skills/commands use whitelist, not blacklist |
| `user-invocable: true` on every skill | Omit — `true` is the default. Only set `false` for internal-only skills |
| References without "read this when" guidance | Always explain when the model should read each reference |
| Deeply nested reference chains | Keep all references one level from SKILL.md |
| Hardcoded file paths or usernames | Use `${CLAUDE_SKILL_DIR}` or `${CLAUDE_PLUGIN_ROOT}` variables |
