# Writing Patterns

Structural patterns for each Claude Code component type. Consult when structuring component bodies.

## Contents

- [Agent Pattern](#agent-pattern)
- [Command Pattern](#command-pattern)
- [Skill Pattern](#skill-pattern)
- [Rule Pattern](#rule-pattern)
- [Common Mistakes](#common-mistakes)

---

## Agent Pattern

Kodizm 5-section format. Every agent follows this structure:

### 1. Identity (1-2 sentences)

Role + core mission. Second person. Declare what the agent IS and DELIVERS.

```markdown
You are a senior software architect who delivers comprehensive, actionable
architecture blueprints by deeply understanding codebases.
```

### 2. Execution (numbered steps)

The work process. Each step is an imperative action.

```markdown
## Execution

1. Extract existing patterns, conventions, and architectural decisions
2. Design the complete feature architecture — pick one approach and commit
3. Specify every file to create or modify with responsibilities and data flow
```

### 3. Output Format (structured template)

Exact output contract. Field names with descriptions.

```markdown
## Output Format

- **Patterns Found**: Existing patterns with file:line references
- **Architecture Decision**: Chosen approach with rationale
- **Implementation Map**: Files to create/modify with build sequence
```

### 4. Failure Conditions (FAILED if:)

Clear failure contract. Concrete, testable conditions.

```markdown
## Failure Conditions

FAILED if: modified files not in step list, tests fail unfixed, no structured report, ignored wisdom from prior steps.
```

### 5. Constraints (hard boundaries)

Scope limits, read-only declarations, evidence requirements.

```markdown
## Constraints

Read-only. No file writes. Deliver analysis and blueprint only.
```

### Size Guidelines

- Target: 40-80 lines body
- Maximum: 120 lines body
- Overflow: move detail to `references/`
- Advisory agents: `disallowedTools: Write, Edit, NotebookEdit`
- Execution agents: `disallowedTools: NotebookEdit` (minimum)

---

## Command Pattern

Phase-based structure with approval gates.

### Opening

Direct task statement framing the collaboration.

```markdown
You are helping a developer implement a new feature. Follow a systematic
approach: understand the codebase deeply, design elegant architectures,
then implement.
```

### Core Principles (optional)

3-4 bullet principles when the command has a guiding philosophy.

```markdown
## Core Principles

- **Understand before acting**: Read existing code patterns first
- **Ask clarifying questions**: Identify ambiguities before designing
- **Simple and elegant**: Prioritize readable, maintainable code
```

### Phase Structure

Each phase: heading, goal, actions.

```markdown
## Phase N: Name

**Goal**: One-line objective

**Actions**:
1. First step
2. Second step
3. Third step
```

### Approval Gates

Insert before destructive or irreversible actions.

```markdown
**DO NOT START WITHOUT USER APPROVAL**
```

### Agent Delegation

Spawn agents with explicit type and prompt.

```markdown
Agent(subagent_type: "ac:explore", prompt: "Find all service classes...")
```

Route to correct model: Haiku for search, Sonnet for execution, Opus for architecture.

### Size Guidelines

- Target: 50-120 lines body
- Maximum: 200 lines body
- Error handling section at end

---

## Skill Pattern

Topic-based structure with reference navigation.

### Opening

Concept definition, third person. State what this skill does.

```markdown
Create high-quality Claude Code extension components: skills, agents,
commands, and rules.
```

### Core Process / Workflow Sections

Domain-specific sections organized by topic.

```markdown
## Core Process

**1. Classify Component Type**
...

**2. Interview**
...
```

### Reference Table

Always at the end. Link every bundled resource with when-to-read guidance.

```markdown
## References

| Topic | File | When to read |
|-------|------|--------------|
| Syntax | [syntax.md](references/syntax.md) | When generating YAML |
| Templates | [templates.md](references/templates.md) | After detecting language |
```

### Size Guidelines

- Target: 200-500 lines body
- Move detail (>100 lines per topic) to `references/`
- One level deep: SKILL.md -> reference.md works; deeper chains break
- References NOT auto-loaded — must explicitly link with "read this when"

---

## Rule Pattern

Flat bullets. No structure. Maximum simplicity.

### Frontmatter

Path glob is the only meaningful field.

```yaml
---
path: "lib/**/*.dart"
---
```

### Body

No heading. No opening sentence. Start with first bullet.

```markdown
- Effective Dart style guide
- Use `const` constructors wherever possible
- Build methods under 50 lines
- Extract widgets instead of deep nesting
- Prefer `final` for variables that do not change
```

### Size Guidelines

- Stack-level rules: 10-20 lines
- Domain-level rules: 15-40 lines
- Never duplicate CLAUDE.md or `my-coding` skill content

---

## Common Mistakes

| Mistake | Fix |
|---|---|
| "You should consider..." | "Use X" or "Extract Y" |
| "Try to keep things clean" | "Methods under 30 lines. Extract helpers." |
| Nested lists 3+ deep | Flatten to max 1 nesting level |
| `allowed-tools` on agents | Use `disallowedTools` (denylist) |
| `disallowedTools` on skills | Use `allowed-tools` (allowlist) |
| References without guidance | Add "read this when" trigger |
| Agent body >120 lines | Move detail to `references/` |
| CRITICAL on every section | Max 1-2 per file — inflation kills signal |
| Bold for inline emphasis | Bold for structural anchors only |
| 50+ word sentences | Break into 2-3 shorter sentences, under 25 words each |
| Passive voice instructions | Active imperative: "Analyze", "Run", "Extract" |
| Multiple options without pick | Commit to one, explain why |
| Explaining basic concepts | Skip — Claude already knows |
| Deeply nested reference chains | Keep all references one level from SKILL.md |
| Hardcoded file paths | Use `${CLAUDE_SKILL_DIR}` or `${CLAUDE_PLUGIN_ROOT}` |
