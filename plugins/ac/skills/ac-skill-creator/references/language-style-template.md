# Language Style Skill Template

Reference template for generating personalized writing and documentation style skills. Read this file when creating a `my-language` style skill via the `/setup-ac-language` command.

---

## SKILL.md Structure

```markdown
---
name: my-language
description: Write in [developer name]'s personal voice across all written content — documentation, articles, commit messages, code comments, and PR descriptions. Use for ALL writing, documentation, and communication tasks. Triggers on any request to write, document, draft, or create written content. Core voice traits — (1) [trait], (2) [trait], (3) [trait]. Load voice-guide.md for detailed tone patterns and examples.md for reference excerpts.
---

# [Developer Name] Language Style

[1-2 sentence voice summary. How does this person sound when they write?]

## Critical Distinction

| Context | Tone | Opening Style | Closing Style |
|---------|------|---------------|---------------|
| **Documentation** | [Professional/Approachable/Formal] | [Direct statement / Problem→Solution] | [End naturally / Summary] |
| **Article/Blog** | [Conversational/Personal/Casual] | [Personal narrative / Context+scope] | [Simple farewell / CTA] |
| **Commit Message** | [Concise/Imperative/Descriptive] | [Imperative verb / Past tense] | N/A |
| **Code Comment** | [Brief/Explanatory/Why-focused] | N/A | N/A |
| **PR Description** | [Structured/Narrative/Bullet-point] | [What changed / Why] | [Testing notes] |

Route tone based on context. When ambiguous, ask which context applies.

## Core Voice Characteristics

| Trait | Implementation |
|-------|----------------|
| **[Trait 1]** | [How to implement — e.g., "Use 'I', 'my', 'we' freely"] |
| **[Trait 2]** | [How to implement] |
| **[Trait 3]** | [How to implement] |
| **[Trait 4]** | [How to implement] |
| **[Trait 5]** | [How to implement] |

## Voice Rules

### Opening Patterns

\`\`\`markdown
<!-- GOOD: [Pattern name] -->
[Example from developer's actual writing]

<!-- BAD: [Why it's wrong] -->
[Counter-example]
\`\`\`

### Introducing Code

\`\`\`markdown
<!-- GOOD -->
[Developer's actual code introduction phrases]

<!-- BAD -->
[Phrases this developer would never use]
\`\`\`

### Transitions

\`\`\`markdown
<!-- GOOD -->
[Developer's actual transition phrases]

<!-- BAD -->
[Forbidden transition patterns]
\`\`\`

### Closing

\`\`\`markdown
<!-- GOOD -->
[Developer's actual closing patterns]

<!-- BAD / NEVER -->
[Forbidden closing phrases]
\`\`\`

### Rhetorical Questions

\`\`\`markdown
<!-- GOOD - [when to use] -->
[Example]

<!-- BAD - [why not] -->
[Counter-example]
\`\`\`

## Structure Templates

### Documentation Structure

1. [Section intro pattern]
2. [Code block pattern]
3. [Explanation pattern]
4. [Callout usage]

### Article Structure

1. [Opening pattern — N sentences]
2. [Topic list (optional)]
3. [Body section flow: explanation → code → result → observation]
4. [Closing pattern]

### Commit Message Structure

\`\`\`
[Format: conventional? imperative? past tense?]
[Example from developer's actual commits]
\`\`\`

## Signature Phrases

### Starting Work
- "[phrase]"
- "[phrase]"

### Demonstrating
- "[phrase]"
- "[phrase]"

### Completing
- "[phrase]"
- "[phrase]"

### Encouraging
- "[phrase]"
- "[phrase]"

[Only include categories that have actual signature phrases. No manufactured phrases.]

## Writing Rules

### [Rule 1 — e.g., Explain Technical Decisions]
[1-sentence rule + example]

### [Rule 2 — e.g., Use Real-World Analogies]
[1-sentence rule + example]

### [Rule 3 — e.g., Keep Grammar Natural]
[1-sentence rule + GOOD/BAD example]

## Formatting Guidelines

| Setting | Value |
|---------|-------|
| Headings | [ATX style / Setext] |
| Code blocks | [Always specify language / Contextual] |
| Callouts | [GitHub alerts / Custom / None] |
| Tables | [For references / Sparingly / Never] |
| Bold | [For emphasis / For labels only] |
| Emoji | [Never / Sparingly / Freely] |
| Lists | [Bullet preferred / Numbered preferred / Mixed] |

## References

- **Voice Guide**: See [references/voice-guide.md](references/voice-guide.md) for tone spectrum and detailed patterns
- **Examples**: See [references/examples.md](references/examples.md) for full excerpts demonstrating these patterns
```

---

## Reference File Structures

### Voice Guide (`references/voice-guide.md`)

Target: 80-150 lines.

```markdown
# Voice Guide

## Tone Spectrum

\`\`\`
[Visual spectrum showing where developer sits per context]
Formal ←――――――――――――――――→ Casual
                ↑
         [Developer position]
\`\`\`

## Approved Patterns

### Section Introductions
[Approved patterns with examples]

### Transitions
[Good and bad examples]

### Code Introductions
[Before/after code block patterns]

### Rhetorical Questions
[When appropriate, with examples]

### Comparisons
[How to show before/after or contrast]

### Closing
[Approved closing patterns or "end naturally" rule]

## Sentence Structure
[Active/passive preference, sentence length, person (I/we/you)]

## Reference Style Examples
[2-3 excerpts from admired documentation/writing]
```

### Examples (`references/examples.md`)

Target: 100-200 lines.

```markdown
# Writing Style - Reference Examples

Excerpts from the developer's published writing demonstrating voice patterns.

## Opening Examples

### Pattern: [Pattern Name]
\`\`\`
[Direct excerpt from developer's writing]
\`\`\`

[... repeat for each pattern type ...]

## Transition Phrases Collection
[Categorized list of actual phrases used]

## Closing Examples
[Direct excerpts]

## Inline Explanation Style
[Code comment examples]
```

---

## Quality Rules for Generated Skills

1. SKILL.md body under 200 lines
2. Every voice rule has GOOD/BAD examples from actual writing
3. Signature phrases are real (from analyzed samples), not invented
4. Critical Distinction table covers all writing contexts the developer uses
5. Voice characteristics table has 4-6 traits
6. Structure templates provided for each primary writing context
7. No generic writing advice — every rule is specific to this developer's voice
8. Examples preserve the developer's natural grammar level (don't over-polish)
